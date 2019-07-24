package io.cnad.api.usermanagement;

import java.util.List;

import javax.inject.Inject;
import javax.json.Json;
import javax.persistence.NoResultException;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;

import org.jboss.logging.Logger;

import io.cnad.api.usermanagement.controller.UserController;
import io.cnad.api.usermanagement.model.User;

@Path("/api")
public class UserResource {

	private static final Logger LOGGER = Logger.getLogger(UserResource.class.getName());

	@Inject
	private UserController userController;

	@GET
	@Path("/users")
	@Produces(MediaType.APPLICATION_JSON)
	public Response getAllUsers() {
		LOGGER.info("Get all function users requested.");
		List<User> result = userController.findUsers();
		LOGGER.debug("Find users executed.");
		LOGGER.trace(result);
		if (result.size() == 0) {
			LOGGER.info("Get all users respond Users not available.");
			return error(Status.NOT_FOUND.getStatusCode(), "Users not available");
		}
		LOGGER.info("Get all users function respond a user list.");
		return Response.ok(result).build();
	}

	@GET
	@Path("/user/{userId}")
	@Produces(MediaType.APPLICATION_JSON)
	public Response getUser(@PathParam("userId") String userId) {
		LOGGER.info("Get user function requested.");
		LOGGER.trace(userId);
		User user = userController.getUser(userId);
		LOGGER.debug("Find user executed.");
		if (user == null) {
			LOGGER.warn("User with id of " + userId + " does not exist.");
			return error(Status.NOT_FOUND.getStatusCode(), "User with id of " + userId + " does not exist.");
		}
		LOGGER.trace(user);
		LOGGER.info("Get user function respond the requested user.");
		return Response.ok(user).build();
	}
	
	@GET
	@Path("/user/username/{username}")
	@Produces(MediaType.APPLICATION_JSON)
	public Response getUserByUsername(@PathParam("username") String username) {
		LOGGER.info("Get user by username function requested.");
		LOGGER.trace(username);
		try {
			User user = userController.getUserByUsername(username);
			LOGGER.debug("Find user executed.");
			LOGGER.trace(user);
			LOGGER.info("Get user by username function respond the requested user.");
			return Response.ok(user).build();
		} catch (NoResultException e) {
			LOGGER.warn("User with username of " + username + " does not exist.");
			return error(Status.NOT_FOUND.getStatusCode(), "User with username of " + username + " does not exist.");
		}
	}

	@POST
	@Path("/user")
	@Consumes(MediaType.APPLICATION_JSON)
	@Produces(MediaType.APPLICATION_JSON)
	public Response createUser(User user) {
		LOGGER.info("Create user function requested.");
		if (user == null) {
			LOGGER.warn("Create user request with invalid payload!");
			return error(Status.BAD_REQUEST.getStatusCode(), "Invalid payload!");
		}
		LOGGER.trace(user);
		if (user.getUsername() == null || user.getUsername().trim().length() == 0) {
			LOGGER.warn("The username is required to create an user!");
			return error(422, "The username is required!");
		}

		try {
			userController.createUser(user);
			LOGGER.debug("Create user executed.");
		} catch (Exception e) {
			LOGGER.error("Create user error: " + e.getMessage());
			return error(Status.INTERNAL_SERVER_ERROR.getStatusCode(), e.getMessage());
		}
		LOGGER.info("Create user function respond the user created.");
		return Response.ok(user).status(201).build();
	}

	@PUT
	@Path("/user/{userId}")
	@Consumes(MediaType.APPLICATION_JSON)
	@Produces(MediaType.APPLICATION_JSON)
	public Response updateUser(@PathParam("userId") String userId, User user) {
		LOGGER.info("Update user function requested.");
		if (user == null || userId == null) {
			LOGGER.warn("Update user request with invalid payload!");
			return error(Status.BAD_REQUEST.getStatusCode(), "Invalid payload!");
		}
		LOGGER.trace(userId);
		LOGGER.trace(user);
		if (user.getUsername() == null || user.getUsername().trim().length() == 0) {
			LOGGER.warn("The username is required to update an user!");
			return error(422, "The username is required!");
		}

		try {
			User entity = userController.getUser(userId);
			LOGGER.debug("Find user executed.");
			if (entity == null) {
				LOGGER.warn("User with id of " + userId + " does not exist.");
				return error(Status.NOT_FOUND.getStatusCode(), "User with id of " + userId + " does not exist.");
			}
			LOGGER.trace(entity);
			entity.setUsername(user.getUsername());
			LOGGER.debug("User username changed.");
			entity = userController.updateUser(user);
			LOGGER.debug("Update user executed.");
			LOGGER.info("Update user function respond the user updated.");
			return Response.ok(entity).status(200).build();
		} catch (Exception e) {
			LOGGER.error("Update user error: " + e.getMessage());
			return error(Status.INTERNAL_SERVER_ERROR.getStatusCode(), e.getMessage());
		}
	}

	@DELETE
	@Path("/user/{userId}")
	public Response deleteUser(@PathParam("userId") String userId) {
		LOGGER.info("Delete user function requested.");
		LOGGER.trace(userId);
		try {
			User entity = userController.getUser(userId);
			LOGGER.debug("Find user executed.");
			if (entity == null) {
				LOGGER.warn("User with id of " + userId + " does not exist.");
				return error(Status.NOT_FOUND.getStatusCode(), "User with id of " + userId + " does not exist.");
			}
			LOGGER.trace(entity);
			userController.deleteUser(entity);
			LOGGER.debug("Delete user executed.");
		} catch (Exception e) {
			LOGGER.error("Update user error: " + e.getMessage());
			return error(Status.INTERNAL_SERVER_ERROR.getStatusCode(), e.getMessage());
		}
		LOGGER.info("Delete user function respond no content.");
		return Response.noContent().build();
	}

	private Response error(int code, String message) {
		return Response.status(code).entity(Json.createObjectBuilder().add("error", message).add("code", code).build())
				.build();
	}
}