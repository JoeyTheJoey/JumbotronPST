document.addEventListener('DOMContentLoaded', function () {
    // Check if moment.js is loaded
    if (typeof moment === "undefined" || typeof moment.tz === "undefined") {
        console.error("Moment.js or Moment-Timezone is not loaded.");
        return;
    }

    // Global variables for audio management
    let currentUrgentColor = '';
    let previousPlayedColor = '';
    let videoPlayTimeout;
    let audioCueTimeout; // Timeout for the alternating audio cue
    let lastPlayedCue = 1; // Track which cue was played last, 1 or 2

    // Function to initialize and update the progress bars
    function main() {
        // Validate schedule data
        if (!Array.isArray(etSchedule) || !etSchedule.length) {
            console.error("Schedule data is not available or incorrect.");
            return;
        }
        const localSchedule = convertScheduleToLocalTime(etSchedule);
        const resetTimes = getNextResetTimes(localSchedule);
        updateProgressBars(resetTimes);
    }

    // Audio setup
    const enableAudioButton = document.getElementById('enableAudioButton');
    if (enableAudioButton) {
        enableAudioButton.addEventListener('click', function() {
            // Attempt to play each audio element to enable auto-play
            document.querySelectorAll('audio').forEach(audio => {
                audio.play().then(() => {
                    audio.pause();
                    audio.currentTime = 0;
                }).catch(error => {
                    console.error("Error initiating audio playback:", error);
                });
            });
            // Remove button after enabling audio
            this.remove();
        });
    }

    // Schedule and timezone setup
    const etSchedule = [
        { color: 'black', etTimes: ['10:30', '13:00', '15:30', '18:00', '20:30', '23:00'] },
        { color: 'orange', etTimes: ['10:45', '13:15', '15:45', '18:15', '20:45', '23:15'] },
        { color: 'silver', etTimes: ['11:00', '13:30', '16:00', '18:30', '21:00', '23:30'] },
        { color: 'pink', etTimes: ['11:15', '13:45', '16:15', '18:45', '21:15', '23:45'] },
        { color: 'blue', etTimes: ['11:30', '14:00', '16:30', '19:00', '21:30', '00:00'] },
        { color: 'gold', etTimes: ['11:45', '14:15', '16:45', '19:15', '21:45', '00:15'] },
        { color: 'purple', etTimes: ['12:00', '14:30', '17:00', '19:30', '22:00', '00:30'] },
        { color: 'yellow', etTimes: ['12:15', '14:45', '17:15', '19:45', '22:15', '00:45'] },
        { color: 'red', etTimes: ['12:30', '15:00', '17:30', '20:00', '22:30', '01:00'] },
        { color: 'green', etTimes: ['12:45', '15:15', '17:45', '20:15', '22:45', '01:15'] },
    ];

    // Convert schedule times to local timezone
    function convertScheduleToLocalTime(schedule) {
        return schedule.map(session => ({
            color: session.color,
            times: session.etTimes.map(etTime => 
                moment.tz(etTime, 'HH:mm', 'America/Los_Angeles')
            )
        }));
    }

    // Get the next reset times for each color
    function getNextResetTimes(localSchedule) {
        const now = moment();
        return localSchedule.map(session => {
            let timesToday = session.times.map(time => moment(time.format('HH:mm'), 'HH:mm'));
            let nextResetTime = timesToday.find(time => time.isAfter(now)) || timesToday[0].add(1, 'day');
            return {
                color: session.color,
                nextResetTime: nextResetTime,
                remainingTime: nextResetTime.diff(now)
            };
        }).sort((a, b) => a.remainingTime - b.remainingTime);
    }

    // Update progress bars based on schedule
    function updateProgressBars(resetTimes) {
        // Only update the first 3 progress bars
        resetTimes.slice(0, 3).forEach((session, index) => {
            const progressBar = document.getElementById(`progress-bar-${index + 1}`);
            const timer = document.getElementById(`timer-${index + 1}`);
            const colorLabel = document.getElementById(`color-label-${index + 1}`);

            if (!progressBar || !timer || !colorLabel) {
                console.error(`One or more elements couldn't be found for ${session.color}`);
                return;
            }

            const totalDuration = 45 * 60 * 1000;
            const remainingTimeInMilliseconds = session.remainingTime;
            const widthPercentage = Math.max(0, 100 * (remainingTimeInMilliseconds / totalDuration));

            // Update progress bar and labels
            progressBar.style.width = `${widthPercentage}%`;
            progressBar.className = `progress-bar background-${session.color.toLowerCase()}`;

            colorLabel.textContent = session.color.toUpperCase();
            const minutes = Math.floor(remainingTimeInMilliseconds / (60 * 1000));
            const seconds = Math.floor((remainingTimeInMilliseconds % (60 * 1000)) / 1000);
            timer.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

            if (index === 0) {
                // Set current urgent color for the first progress bar
                currentUrgentColor = session.color.toLowerCase();
                const currentIndex = etSchedule.findIndex(e => e.color.toLowerCase() === session.color.toLowerCase());
                const previousIndex = (currentIndex - 1 + etSchedule.length) % etSchedule.length;
                const previousColor = etSchedule[previousIndex].color.toLowerCase();
                const boxPrevious = document.getElementById('box-previous');
                boxPrevious.style.backgroundColor = previousColor;
                boxPrevious.textContent = previousColor.toUpperCase();
            }

            // Trigger video and audio when the timer reaches zero
            if (remainingTimeInMilliseconds < 1000) {
                triggerVideoAndAudio();
            }
        });
    }

    // Trigger video and audio playback
    function triggerVideoAndAudio() {
        // Schedule video playback after 5 minutes
        if (videoPlayTimeout) {
            clearTimeout(videoPlayTimeout);
        }
        videoPlayTimeout = setTimeout(() => {
            playScheduledVideo();
        }, 5 * 60 * 1000); // 5 minutes after depletion

        // Schedule alternating audio cue playback after 10 minutes
        if (audioCueTimeout) {
            clearTimeout(audioCueTimeout);
        }
        audioCueTimeout = setTimeout(() => {
            playAlternatingAudioCue();
        }, 10 * 60 * 1000); // 10 minutes after depletion

        // Play audio immediately if it's the current urgent color
        playScheduledAudio();
    }

    // Video playback function
    function playScheduledVideo() {
        const video = document.getElementById('scheduled-video');
        video.style.display = 'block';
        video.play().then(() => {
            console.log('Playing scheduled video');
        }).catch(error => {
            console.error('Failed to play scheduled video:', error);
        });

        video.addEventListener('ended', () => {
            video.style.display = 'none';
            console.log('Scheduled video hidden');
            videoPlayTimeout = null;
        });
    }

    // Scheduled audio playback for the current urgent color
    function playScheduledAudio() {
        const urgentAudio = document.getElementById(`audio-${currentUrgentColor}`);
        if (urgentAudio && currentUrgentColor !== previousPlayedColor) {
            if (urgentAudio.paused) {
                urgentAudio.play().then(() => {
                    console.log(`Playing urgent audio for color: ${currentUrgentColor}`);
                    previousPlayedColor = currentUrgentColor;
                    urgentAudio.onended = () => playAudioEnding();
                }).catch(error => {
                    console.error(`Failed to play urgent audio for ${currentUrgentColor}:`, error);
                });
            }
        }
    }

    // Play ending audio after the urgent audio
    function playAudioEnding() {
        const audioEnding = document.getElementById('audio-ending');
        if (audioEnding) {
            audioEnding.play().then(() => {
                console.log("Audio ending playing successfully.");
            }).catch(error => {
                console.error("Failed to play audio-ending:", error);
            });
        } else {
            console.error("Audio-ending element not found.");
        }
    }

    // Alternate audio cues playback
    function playAlternatingAudioCue() {
        const audioCue = document.getElementById(`audio-cue${lastPlayedCue}`);
        if (audioCue) {
            audioCue.play().then(() => {
                console.log(`Playing audio cue ${lastPlayedCue}`);
                // Cycle through cues 1, 2, and 3
                lastPlayedCue = (lastPlayedCue % 3) + 1; // This will increment the cue number and reset to 1 after 3
            }).catch(error => {
                console.error(`Failed to play audio cue ${lastPlayedCue}:`, error);
            });
        } else {
            console.error(`Audio cue ${lastPlayedCue} element not found.`);
        }
    }

    // Schedule audio play at quarter-hour intervals
    function scheduleAudioPlay() {
        const firstDelay = timeUntilNextQuarterHour();
        setTimeout(() => {
            playScheduledAudio();
            setInterval(playScheduledAudio, 15 * 60 * 1000);
        }, firstDelay);

        const firstThirtyFiveMinuteMarkDelay = timeUntilNextThirtyFiveMinutes();
        setTimeout(() => {
            playThirtyFiveMinuteAudio();
            setInterval(playThirtyFiveMinuteAudio, 60 * 60 * 1000);
        }, firstThirtyFiveMinuteMarkDelay);
    }

    // Calculate time until the next quarter-hour
    function timeUntilNextQuarterHour() {
        const now = new Date();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        const milliseconds = now.getMilliseconds();
        let minutesToNextQuarterHour = 15 - (minutes % 15);
        if (minutesToNextQuarterHour === 15 && seconds === 0 && milliseconds === 0) {
            return 0;
        } else {
            let secondsToNextQuarterHour = (minutesToNextQuarterHour * 60) - seconds;
            let millisecondsToNextQuarterHour = (secondsToNextQuarterHour * 1000) - milliseconds;
            return millisecondsToNextQuarterHour;
        }
    }

    // Calculate time until the next 35-minute mark
    function timeUntilNextThirtyFiveMinutes() {
        const now = new Date();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        const milliseconds = now.getMilliseconds();
        let minutesToNextThirtyFive = 35 - minutes;
        if (minutesToNextThirtyFive <= 0) minutesToNextThirtyFive += 60;
        let secondsToNextThirtyFive = minutesToNextThirtyFive * 60 - seconds;
        let millisecondsToNextThirtyFive = secondsToNextThirtyFive * 1000 - milliseconds;
        return millisecondsToNextThirtyFive;
    }

    // Play audio at the 35-minute mark
    function playThirtyFiveMinuteAudio() {
        const thirtyFiveMinuteAudio = document.getElementById('audio-promo');
        if (thirtyFiveMinuteAudio && thirtyFiveMinuteAudio.paused) {
            thirtyFiveMinuteAudio.play().catch(error => {
                console.error("Failed to play 35-minute audio:", error);
            });
        }
    }

    // Display local time on the page
    function displayLocalTime() {
        const now = new Date();
        const hours = now.getHours() % 12 || 12;
        const minutes = now.getMinutes();
        const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
        const meridiem = now.getHours() >= 12 ? 'PM' : 'AM';

        const timeContainer = document.getElementById('local-time-container');
        if (timeContainer) {
            timeContainer.textContent = `${hours}:${formattedMinutes} ${meridiem}`;
        } else {
            console.warn("Time container not found.");
        }
    }

    // Initialize display of local time
    displayLocalTime();
    setInterval(displayLocalTime, 1000);

    // Run main logic
    main();
    setInterval(main, 1000);
});
