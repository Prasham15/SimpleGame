# Dockerfile for Spring Boot Kotlin backend
FROM gradle:8.7-jdk17 AS build
WORKDIR /app

# Copy gradle configuration files
COPY gradle /app/gradle
COPY gradlew /app/gradlew
COPY build.gradle.kts /app/
COPY settings.gradle.kts /app/

# Download dependencies (caching layer)
RUN gradle dependencies --no-daemon || true

# Copy source code and build jar
COPY src /app/src
RUN gradle bootJar --no-daemon

# Run stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
