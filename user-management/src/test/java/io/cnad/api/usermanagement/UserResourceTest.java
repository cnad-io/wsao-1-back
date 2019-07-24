package io.cnad.api.usermanagement;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.equalTo;
import static org.hamcrest.MatcherAssert.assertThat;

import java.util.UUID;

import javax.json.Json;
import javax.json.JsonObject;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.core.JsonProcessingException;

import io.cnad.api.usermanagement.model.User;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;

@QuarkusTest
@Tag("unit")
@DisplayName("User API Tests")
public class UserResourceTest {
	
	@Test
	@Tag("get-all-users")
	@DisplayName("When is requested all users should return a list of 4 users")
	public void shouldReturnListUsers() throws JsonProcessingException {
		User[] users = given().when().get("/api/users").then().assertThat().statusCode(200).extract().as(User[].class);
		assertThat(users.length, equalTo(4));
	}

	@Test
	@Tag("get-user")
	@DisplayName("When is requested an user by id should return an error message user not found if that user not exists")
	public void shouldReturnUserNotFound() {
		given().when().get("/api/user/61336330-6135-6665-2d61-6436612d3139").then().assertThat().statusCode(404)
				.body("error", equalTo("User with id of 61336330-6135-6665-2d61-6436612d3139 does not exist."));
	}

	@Test
	@Tag("get-user")
	@DisplayName("When is requested an user by id should return the requested user if exists")
	public void shouldReturnUser() {
		given().when().get("/api/user/61336330-6135-6665-2d61-6436612d3131").then().assertThat().statusCode(200)
				.body("username", equalTo("camedeir"));
	}
	
	@Test
	@Tag("get-user-by-username")
	@DisplayName("When is requested an user by username should return an error message user not found if that user not exists")
	public void shouldReturnUserByUsernameNotFound() {
		given().when().get("/api/user/username/camedeiros").then().assertThat().statusCode(404)
				.body("error", equalTo("User with username of camedeiros does not exist."));
	}

	@Test
	@Tag("get-user-by-username")
	@DisplayName("When is requested an user by username should return the requested user if exists")
	public void shouldReturnUserByUsername() {
		given().when().get("/api/user/username/gschmidt").then().assertThat().statusCode(200)
				.body("username", equalTo("gschmidt"));
	}

	@Test
	@Tag("create-user")
	@DisplayName("When is requested an user creation should return an error saying the username is required to create an user if the username wasn't sent")
	public void shouldReturnErrorForUsernameToCreate() {
		JsonObject object = Json.createObjectBuilder().add("id", UUID.randomUUID().toString()).build();
		given().contentType(ContentType.JSON).accept(ContentType.JSON).body(object.toString()).when().post("/api/user")
				.then().assertThat().statusCode(422)
				.body("error", equalTo("The username is required!"));
	}

	@Test
	@Tag("create-user")
	@DisplayName("When is requested an user creation should return the created user if was sent the user ID and username")
	public void shouldReturnCreatedUser() {
		JsonObject object = Json.createObjectBuilder().add("id", UUID.randomUUID().toString())
				.add("username", "ejemplo").build();
		given().contentType(ContentType.JSON).accept(ContentType.JSON).body(object.toString()).when().post("/api/user")
				.then().assertThat().statusCode(201).body("username", equalTo("ejemplo"));
	}

	@Test
	@Tag("update-user")
	@DisplayName("When is requested an user update should return an error saying the username is required to create an user if the username wasn't sent")
	public void shouldReturnErrorForUsernameToUpdate() {
		JsonObject object = Json.createObjectBuilder().add("id", "61336330-6135-6665-2d61-6436612d3131").build();
		given().contentType(ContentType.JSON).accept(ContentType.JSON).body(object.toString()).when()
				.put("/api/user/61336330-6135-6665-2d61-6436612d3131").then().assertThat().statusCode(422)
				.body("error", equalTo("The username is required!"));
	}

	@Test
	@Tag("update-user")
	@DisplayName("When is requested an user update should return the updated user if was sent the user ID and username")
	public void shouldReturnUpdatedUser() {
		JsonObject object = Json.createObjectBuilder().add("id", "61336331-3166-3663-2d61-6436612d3131")
				.add("username", "geraldschmidt").build();
		given().contentType(ContentType.JSON).accept(ContentType.JSON).body(object.toString()).when()
				.put("/api/user/61336331-3166-3663-2d61-6436612d3131").then().assertThat().statusCode(200)
				.body("username", equalTo("geraldschmidt"));
	}

	@Test
	@Tag("delete-user")
	@DisplayName("When is requested an user delete should return an error message user not found if that user not exists")
	public void shouldReturnUserNotFoundToDelete() {
		given().when().delete("/api/user/61336330-6135-6665-2d61-6436612d3139").then().assertThat().statusCode(404)
				.body("error", equalTo("User with id of 61336330-6135-6665-2d61-6436612d3139 does not exist."));
	}

	@Test
	@Tag("delete-user")
	@DisplayName("When is requested an user delete should return a confimation code")
	public void shouldDeleteUser() {
		given().when().delete("/api/user/61336330-6135-6665-2d61-6436612d3131").then().assertThat().statusCode(204);
	}
}