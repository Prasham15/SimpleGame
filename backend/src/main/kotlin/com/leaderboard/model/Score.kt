package com.leaderboard.model

import jakarta.persistence.*
import java.time.Instant

@Entity
@Table(name = "scores")
class Score(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    var user: User? = null,

    @Column(nullable = false, columnDefinition = "varchar(255) default 'tap_speeder'")
    var game: String = "tap_speeder",

    @Column(nullable = false)
    var score: Int = 0,

    @Column(nullable = false, name = "created_at")
    var createdAt: Instant = Instant.now()
)
