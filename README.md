# Inventory Hub - E-commerce Management System

A full-stack e-commerce management system built with React frontend and Java Spring Boot microservices backend.

## Architecture

- **Frontend**: React.js with modern UI components
- **Backend**: Java Spring Boot microservices architecture
- **Services**: API Gateway, Auth Server, Products, Orders, Inventory, Payment, Shipping, Email
- **Service Discovery**: Eureka Server
- **Database**: MySQL
- **Image Storage**: Cloudinary

## Quick Start

### Prerequisites
- Node.js 16+
- Java 17+
- Maven 3.6+
- MySQL 8.0+

### Frontend Setup
```bash
cd inventory-hub-react
npm install
npm run dev
```

### Backend Setup

1. **Configure Environment Variables**
   Copy `application.properties.example` to `application.properties` in each service and set:
   ```properties
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   DB_URL=jdbc:mysql://localhost:3306/your_db
   DB_USERNAME=your_username
   DB_PASSWORD=your_password
   ```

2. **Start Services**
   ```bash
   cd InventoryManagementSystem-feature-dev01
   
   # Start Service Registry first
   cd service-registry
   mvn spring-boot:run
   
   # Start other services
   cd ../api-gateway && mvn spring-boot:run &
   cd ../auth-server && mvn spring-boot:run &
   cd ../products-service && mvn spring-boot:run &
   # ... repeat for other services
   ```

## Services

- **Service Registry** (8761): Eureka server for service discovery
- **API Gateway** (8080): Routes requests to appropriate services
- **Auth Server** (9090): Authentication and authorization
- **Products Service** (9094): Product catalog management
- **Orders Service** (9092): Order processing
- **Inventory Service** (9093): Stock management
- **Payment Service** (9095): Payment processing
- **Shipping Service** (9096): Shipping management
- **Email Service** (9097): Email notifications

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Security Note

Never commit sensitive credentials. Use environment variables for:
- Database passwords
- API keys
- Cloud service credentials