package com.pixelbloom.payment;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class InventoryPaymentServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(InventoryPaymentServiceApplication.class, args);
	}

}
