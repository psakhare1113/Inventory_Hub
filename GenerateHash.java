import org.springframework.security.crypto.bcrypt.BCrypt;

public class GenerateHash {
    public static void main(String[] args) {
        String password = args.length > 0 ? args[0] : "warehouse123";
        String salt = BCrypt.gensalt(10);
        String hash = BCrypt.hashpw(password, salt);
        System.out.println("Hash: " + hash);
        System.out.println("Verify: " + BCrypt.checkpw(password, hash));
    }
}
