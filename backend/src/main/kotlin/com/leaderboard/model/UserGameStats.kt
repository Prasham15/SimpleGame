package com.leaderboard.model

import jakarta.persistence.*

@Entity
@Table(
    name = "user_game_stats",
    uniqueConstraints = [UniqueConstraint(columnNames = ["user_id", "game"])]
)
class UserGameStats(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    var user: User? = null,

    @Column(nullable = false)
    var game: String = "",

    @Column(nullable = false, name = "games_played")
    var gamesPlayed: Int = 0,

    @Column(nullable = false, name = "total_score_sum")
    var totalScoreSum: Long = 0L
)
