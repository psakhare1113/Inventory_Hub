package com.pixelbloom.auth_server.config;

import com.pixelbloom.auth_server.enums.CustomerStatus;
import com.pixelbloom.auth_server.model.Customer;
import com.pixelbloom.auth_server.model.RefreshToken;
import com.pixelbloom.auth_server.repository.AdminRepository;
import com.pixelbloom.auth_server.repository.CustomerRepository;
import com.pixelbloom.auth_server.repository.DeliveryBoyRepository;
import com.pixelbloom.auth_server.service.RefreshTokenService;
import com.pixelbloom.auth_server.utils.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.time.LocalDateTime;

/**
 * Handles the redirect after a successful Google OAuth2 login.
 *
 * Flow:
 *  1. Extract email + name from the Google user info.
 *  2. Find or auto-create the Customer record (email-verified, ACTIVE).
 *  3. Generate a JWT with the correct role (ADMIN / DELIVERY_BOY / USER).
 *  4. Redirect the browser to the React frontend callback URL with the token
 *     and user info as query parameters.
 */
@Component
public class OAuth2LoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final CustomerRepository customerRepository;
    private final AdminRepository adminRepository;
    private final DeliveryBoyRepository deliveryBoyRepository;
    private final JwtUtil jwtUtil;
    private final RefreshTokenService refreshTokenService;

    @Value("${app.oauth2.frontend-redirect-uri:http://localhost:3000/oauth2/callback}")
    private String frontendRedirectUri;

    public OAuth2LoginSuccessHandler(CustomerRepository customerRepository,
                                     AdminRepository adminRepository,
                                     DeliveryBoyRepository deliveryBoyRepository,
                                     JwtUtil jwtUtil,
                                     RefreshTokenService refreshTokenService) {
        this.customerRepository = customerRepository;
        this.adminRepository = adminRepository;
        this.deliveryBoyRepository = deliveryBoyRepository;
        this.jwtUtil = jwtUtil;
        this.refreshTokenService = refreshTokenService;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        String email     = oAuth2User.getAttribute("email");
        String firstNameRaw = oAuth2User.getAttribute("given_name");
        String lastNameRaw  = oAuth2User.getAttribute("family_name");
        String picture   = oAuth2User.getAttribute("picture");

        // Use final variables so they can be captured inside the lambda below
        final String firstName = firstNameRaw != null ? firstNameRaw : "";
        final String lastName  = lastNameRaw  != null ? lastNameRaw  : "";

        // Find or create the customer
        Customer customer = customerRepository.findByEmail(email).orElseGet(() -> {
            Customer newCustomer = new Customer();
            newCustomer.setEmail(email);
            newCustomer.setFirstName(firstName);
            newCustomer.setLastName(lastName);
            // OAuth2 users don't have a local password — set a placeholder
            newCustomer.setPassword("");
            newCustomer.setEmailVerified(true);
            newCustomer.setStatus(CustomerStatus.ACTIVE);
            newCustomer.setCreatedAt(LocalDateTime.now());
            newCustomer.setUpdatedAt(LocalDateTime.now());
            return customerRepository.save(newCustomer);
        });

        // If the customer exists but was not yet verified, activate them now
        if (!Boolean.TRUE.equals(customer.getEmailVerified())) {
            customer.setEmailVerified(true);
            customer.setStatus(CustomerStatus.ACTIVE);
            customer.setUpdatedAt(LocalDateTime.now());
            customerRepository.save(customer);
        }

        // Determine role
        boolean isAdmin       = adminRepository.existsByEmail(email);
        boolean isDeliveryBoy = deliveryBoyRepository.existsByEmail(email);
        String  role          = isAdmin ? "ADMIN" : isDeliveryBoy ? "DELIVERY_BOY" : "USER";

        String token = jwtUtil.generateToken(email, customer.getId(), role);

        // Create refresh token for OAuth2 login (FR-01)
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(
                customer.getId(), email, "OAuth2/Google", request.getRemoteAddr());

        // Build redirect URL with token + user info as query params
        String redirectUrl = UriComponentsBuilder.fromUriString(frontendRedirectUri)
                .queryParam("token",        token)
                .queryParam("refreshToken", refreshToken.getToken())
                .queryParam("expiresIn",    jwtUtil.getTokenValidity() / 1000)
                .queryParam("customerId",   customer.getId())
                .queryParam("firstName",    customer.getFirstName())
                .queryParam("lastName",     customer.getLastName())
                .queryParam("email",        email)
                .queryParam("role",         role)
                .queryParam("isAdmin",      isAdmin)
                .queryParam("isDeliveryBoy", isDeliveryBoy)
                .queryParam("picture",      picture != null ? picture : "")
                .build().toUriString();

        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }
}
