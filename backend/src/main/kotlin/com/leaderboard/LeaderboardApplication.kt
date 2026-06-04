package com.leaderboard

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class LeaderboardApplication

fun main(args: Array<String>) {
    runApplication<LeaderboardApplication>(*args)
}
