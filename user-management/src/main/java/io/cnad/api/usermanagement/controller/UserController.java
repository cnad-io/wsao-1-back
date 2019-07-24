package io.cnad.api.usermanagement.controller;

import java.util.List;

import javax.enterprise.context.ApplicationScoped;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.transaction.Transactional;

import io.cnad.api.usermanagement.model.User;

@ApplicationScoped
public class UserController {

	@PersistenceContext
    EntityManager em;
	
	public List<User> findUsers() {
		return em.createNamedQuery("Users.findAll", User.class)
				.getResultList();
	}
	
	public User getUser(String userId) {
		return em.find(User.class, userId);
	}
	
	public User getUserByUsername(String username) {
		return em.createNamedQuery("Users.findByUsername", User.class)
				.setParameter("username", username)
				.getSingleResult();
	}
	
	@Transactional
	public void createUser(User user) {
		em.persist(user);
	}
	
	@Transactional
	public User updateUser(User user) {
		return em.merge(user);
	}
	
	@Transactional
	public void deleteUser(User user) {
		em.remove(em.contains(user) ? user : em.merge(user));
	} 
}
