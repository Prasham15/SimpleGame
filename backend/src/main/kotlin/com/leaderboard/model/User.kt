package com.leaderboard.model

import com.fasterxml.jackson.annotation.JsonIgnore
import jakarta.persistence.*

@Entity
@Table(name = "users")
class User(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(nullable = false, unique = true)
    var username: String = "",

    @JsonIgnore
    @Column(nullable = false, name = "password_hash")
    var passwordHash: String = "",

    @Column(nullable = false, name = "country_code", columnDefinition = "varchar(5) default 'UN'")
    var countryCode: String = "UN"
)
