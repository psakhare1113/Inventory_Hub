package com.pixelbloom.orders;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableDiscoveryClient
@EnableFeignClients(basePackages = "com.pixelbloom.orders.restClients")
@EnableScheduling
public 	class InventoryOrdersServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(InventoryOrdersServiceApplication.class, args);
	}

}
