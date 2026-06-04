package com.leaderboard.controller

import org.springframework.web.bind.annotation.CrossOrigin
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = ["*"])
class StatusController {

    @GetMapping("/status")
    fun getStatus(): Map<String, String> {
        return mapOf(
            "status" to "OK",
            "message" to "Backend is running and connected to PostgreSQL database."
        )
    }
}
