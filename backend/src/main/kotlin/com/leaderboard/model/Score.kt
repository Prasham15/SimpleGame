package com.leaderboard.model

import jakarta.persistence.*
import java.time.Instant

@Entity
@Table(name = "scores")
class Score(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(nullable = false)
    var username: String = "",

    @Column(nullable = false)
    var score: Int = 0,

    @Column(nullable = false, name = "created_at")
    var createdAt: Instant = Instant.now()
)
