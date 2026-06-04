package com.leaderboard.repository

import com.leaderboard.model.Score
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository

@Repository
interface ScoreRepository : JpaRepository<Score, Long> {
    fun findTop100ByOrderByScoreDescCreatedAtAsc(): List<Score>

    @Query("SELECT MAX(s.score) FROM Score s WHERE s.user.id = :userId")
    fun findBestScoreByUserId(userId: Long): Int?

    @Query("SELECT COUNT(s) FROM Score s WHERE s.user.id = :userId")
    fun countByUserId(userId: Long): Long

    @Query("SELECT AVG(s.score) FROM Score s WHERE s.user.id = :userId")
    fun findAverageScoreByUserId(userId: Long): Double?

    @Query(
        value = """
            SELECT COUNT(*) + 1 
            FROM (
                SELECT user_id, MAX(score) as max_score 
                FROM scores 
                GROUP BY user_id
            ) as user_bests 
            WHERE max_score > :userMaxScore
        """,
        nativeQuery = true
    )
    fun calculateRank(userMaxScore: Int): Long
}
