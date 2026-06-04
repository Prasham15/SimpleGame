package com.leaderboard.security

import com.leaderboard.model.Score
import com.leaderboard.model.UserGameStats
import com.leaderboard.repository.ScoreRepository
import com.leaderboard.repository.UserGameStatsRepository
import org.slf4j.LoggerFactory
import org.springframework.boot.context.event.ApplicationReadyEvent
import org.springframework.context.event.EventListener
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional

@Component
class DatabaseMigrator(
    private val scoreRepository: ScoreRepository,
    private val userGameStatsRepository: UserGameStatsRepository
) {
    private val logger = LoggerFactory.getLogger(DatabaseMigrator::class.java)

    @EventListener(ApplicationReadyEvent::class)
    @Transactional
    fun migrateData() {
        logger.info("Starting database deduplication and migration check...")

        val allScores = scoreRepository.findAll()
        if (allScores.isEmpty()) {
            logger.info("No scores found. Migration not required.")
            return
        }

        val groups = allScores.groupBy { score ->
            val gameName = if (score.game.isNullOrEmpty()) "tap_speeder" else score.game
            Pair(score.user?.id, gameName)
        }

        var deletedCount = 0
        var statsCreatedCount = 0

        for ((key, scoresInGroup) in groups) {
            val userId = key.first ?: continue
            val game = key.second
            val user = scoresInGroup.first().user ?: continue

            scoresInGroup.forEach { score ->
                if (score.game.isNullOrEmpty()) {
                    score.game = "tap_speeder"
                    scoreRepository.save(score)
                }
            }

            val sortedScores = scoresInGroup.sortedWith(compareByDescending<Score> { it.score }.thenBy { it.createdAt })
            val highestScoreRow = sortedScores.first()

            val gamesPlayed = scoresInGroup.size
            val totalScoreSum = scoresInGroup.sumOf { it.score.toLong() }

            val existingStats = userGameStatsRepository.findByUserIdAndGame(userId, game)
            if (existingStats == null) {
                userGameStatsRepository.save(
                    UserGameStats(
                        user = user,
                        game = game,
                        gamesPlayed = gamesPlayed,
                        totalScoreSum = totalScoreSum
                    )
                )
                statsCreatedCount++
            }

            val rowsToDelete = sortedScores.drop(1)
            if (rowsToDelete.isNotEmpty()) {
                scoreRepository.deleteAll(rowsToDelete)
                deletedCount += rowsToDelete.size
            }
        }

        logger.info("Database migration completed: Deleted ${deletedCount} duplicate score records, initialized ${statsCreatedCount} UserGameStats records.")
    }
}
