package com.leaderboard.repository

import com.leaderboard.model.UserGameStats
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface UserGameStatsRepository : JpaRepository<UserGameStats, Long> {
    fun findByUserIdAndGame(userId: Long, game: String): UserGameStats?
}
