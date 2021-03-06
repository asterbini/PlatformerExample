﻿//-----------------------------------------------------------------------------
// PlatformerGame.js
//
// Inspired by the Microsoft XNA Community Game Platformer Sample
// Copyright (C) Microsoft Corporation. All rights reserved.
// Ported to HTML5 Canvas with EaselJS by David Rousset - http://blogs.msdn.com/davrous
//-----------------------------------------------------------------------------

/// <summary>
/// This is the main type for your game
/// </summary>
(function (window) {
    //usefull keycodes
    var KEYCODE_SPACE = 32;
    var KEYCODE_UP = 38;
    var KEYCODE_LEFT = 37;
    var KEYCODE_RIGHT = 39;
    var KEYCODE_W = 87;
    var KEYCODE_A = 65;
    var KEYCODE_D = 68;

    // The number of levels in the Levels directory of our content. We assume that
    // levels in our content are 0-based and that all numbers under this constant
    // have a level file present. This allows us to not need to check for the file
    // or handle exceptions, both of which can add unnecessary time to level loading.
    var numberOfLevels = 4;

    // Used in case of an HTTP issue or access denied on file://
    // This is a static level. So if you're looping always on the same level
    // You're stuck in the Matrix because of an exception somewhere... Up to you to find where!
    var hardcodedErrorTextLevel =
"....................\
..........X.........\
.......------.......\
...--..........--...\
..G..............G..\
#:##..G.G.G.G....#:#\
.......G.G.GBG......\
......--------......\
...--...........--..\
....................\
AG.G.D..............\
###:######..........\
....................\
.1..GGGGGGGG..GGGCGG\
#############.####:#";

    var hardcodedLevel = [
"\
....................\
....................\
....................\
....................\
....................\
....................\
....................\
.........GGG........\
.........###........\
....................\
....GGG.......GGG...\
....###.......###...\
....................\
.1...........A....X.\
####################\
"
,
"\
....................\
....................\
..........X.........\
.......######.......\
..G..............G..\
####..G.G.G.G....###\
.......G.G.GCG......\
......--------......\
...--...........--..\
......GGGG.GGGG.....\
.G.G...GG..G....G.G.\
####...GG..GGGG.####\
.......GG..G........\
.1....GGGG.GGGG.....\
####################\
"
,
"\
....................\
...G............X...\
...--..G.......--...\
....G.--........G...\
...--..........--...\
...G......G....G....\
...--....--....--...\
....G...........G...\
...--........G.--...\
...G........--.G....\
...--..........--...\
....G...........G...\
...--..........--...\
.1..................\
####################\
"
,
"\
....................\
..........X.........\
.......------.......\
...--..........--...\
..G..............G..\
#:##..G.G.G.G....#:#\
.......G.G.GBG......\
......--------......\
...--...........--..\
....................\
AG.G.D..............\
###:######..........\
....................\
.1..GGGGGGGG..GGGCGG\
#############.####:#\
"
    ];

    // Variables used to handle the overlay canvas to display "You died", "You win", etc.
    var statusCanvas = null;
    var statusCanvasCtx = null;
    var overlayEnabled = true;
    var scoreText = null;
    var timeRemainingText = null;

    // Displaying the timer in red under 30s of remaining time
    var WarningTime = 30;

    var optimalRatio;
    var oneOfThisOverlay;

    function PlatformerGame(stage, contentManager, gameWidth, gameHeight, levelIndexToLoad) {
        this.platformerGameStage = stage;
        this.platformerGameContentManager = contentManager;
        this.levelIndex = -1;
        this.level = null;
        oneOfThisOverlay = this.platformerGameContentManager.winOverlay;
        this.UpdateRatio(gameWidth, gameHeight);
        this.wasContinuePressed = false;
        this.continuePressed = false;
        statusCanvas = null;
        statusCanvasCtx = null;
        overlayEnabled = true;
        scoreText = null;
        timeRemainingText = null;
        this.HeroState;

        // Preparing the overlay canvas for future usage
        this.SetOverlayCanvas();

        // Little closure needed here
        var instance = this; // store the current context 

        // Our hero can be moved with the arrow keys (left, right)
        // And jump with W
        document.onkeydown = function (e) {
            instance.handleKeyDown(e);
        };

        document.onkeyup = function (e) {
            instance.handleKeyUp(e);
        };

        // This event is triggered when the user interaction results in a tap gesture.
        this.platformerGameStage.canvas.addEventListener("mousedown", function (e) {
            instance.gestureListener(e);
        }, false);

        this.LoadNextLevel();
    };

    PlatformerGame.prototype.gestureListener = function () {
        this.level.Hero.isJumping = true;
        this.continuePressed = true;
    };

    PlatformerGame.prototype.pause = function () {
        Ticker.setPaused(true);
    };

    // Update logic callbacked by EaselJS
    // Equivalent of the Update() method of XNA
    PlatformerGame.prototype.tick = function () {
        try {
            if (this.level !== null) {
                this.HandleInput();
                this.level.Update();
                this.UpdateScore();

                // If the hero died or won, display the appropriate overlay
                if (overlayEnabled) {
                    this.DrawOverlay();
                }
                this.continuePressed = false;
            }
        }
        catch (e) {
            console.log('Error', e);
        }
    };

    // Starting the game
    PlatformerGame.prototype.StartGame = function () {
        // we want to do some work before we update the canvas,
        // otherwise we could use Ticker.addListener(stage);
        Ticker.addListener(this);
        // Targeting 60 FPS
        Ticker.setFPS(60);
        //Ticker.setInterval(17);
    };

    PlatformerGame.prototype.UpdateRatio = function (gameWidth, gameHeight) {
        Ticker.setPaused(true);
        this.gameWidth = gameWidth;
        this.gameHeight = gameHeight;
        this.scaleToFitX = gameWidth / 800;
        this.scaleToFitY = gameHeight / 480;

        var currentScreenRatio = gameWidth / gameHeight;
        optimalRatio = Math.min(this.scaleToFitX, this.scaleToFitY);

        if (currentScreenRatio < 1.77 || currentScreenRatio > 1.79) {
            this.scaleToFitX = optimalRatio;
            this.scaleToFitY = optimalRatio;
        }

        this.platformerGameStage.canvas.width = this.gameWidth;
        this.gameHeight = 480 * optimalRatio;
        this.platformerGameStage.canvas.height = this.gameHeight;

        if (this.level !== null) {
            this.level.UpdateRatio(gameWidth, gameHeight, this.scaleToFitX, this.scaleToFitY);
            this.ResetOverlayCanvas();
            overlayEnabled = true;
            this.DrawOverlay();
        }

        Ticker.setPaused(false);
    };

    // Well, the method's name should be self explicit ;-)
    PlatformerGame.prototype.UpdateScore = function () {
        if (scoreText === null) {
            timeRemainingText = new Text("TIME: ", "bold 14px Arial", "yellow");
            timeRemainingText.x = 10;
            timeRemainingText.y = 20;
            this.platformerGameStage.addChild(timeRemainingText);

            scoreText = new Text("SCORE: 0", "bold 14px Arial", "yellow");
            scoreText.x = 10;
            scoreText.y = 34;
            this.platformerGameStage.addChild(scoreText);
        }

        if (this.level.TimeRemaining < WarningTime && !this.level.ReachedExit) {
            timeRemainingText.color = "red";
        }
        else {
            timeRemainingText.color = "yellow";
        }

        scoreText.text = "SCORE: " + this.level.Score;
        timeRemainingText.text = "TIME: " + parseInt(this.level.TimeRemaining);
    };

    // Perform the appropriate action to advance the game and
    // to get the player back to playing.
    PlatformerGame.prototype.HandleInput = function () {
        if (!this.wasContinuePressed && this.continuePressed) {
            this.HideStatusCanvas();

            if (!this.level.Hero.IsAlive) {
                this.level.StartNewLife();
            }
            else if (this.level.TimeRemaining == 0) {
                if (this.level.ReachedExit)
                    this.LoadNextLevel();
                else
                    this.ReloadCurrentLevel();
            }
        }

        this.wasContinuePressed = this.continuePressed;
    };

    // Determine the status overlay message to show.
    PlatformerGame.prototype.DrawOverlay = function () {
        var status = null;

        if (this.level.TimeRemaining == 0) {
            if (this.level.ReachedExit) {
                status = this.platformerGameContentManager.winOverlay;
            }
            else {
                status = this.platformerGameContentManager.loseOverlay;
            }
        }
        else if (!this.level.Hero.IsAlive) {
            status = this.platformerGameContentManager.diedOverlay;
        }

        if (status !== null) {
            this.ShowStatusCanvas(status);
        }
    };

    // Creating a second canvas to display it over the main gaming canvas 
    // It's displayed in style:absolute
    // It is used to display to proper overlay contained in /overlays folder
    // with some opacity effect
    PlatformerGame.prototype.SetOverlayCanvas = function () {
        statusCanvas = document.createElement("canvas");
        document.body.appendChild(statusCanvas);
        statusCanvasCtx = statusCanvas.getContext("2d");

        statusCanvas.setAttribute('width', oneOfThisOverlay.width * optimalRatio);
        statusCanvas.setAttribute('height', oneOfThisOverlay.height * optimalRatio);
        // We center it
        var statusX = (this.gameWidth - (oneOfThisOverlay.width * optimalRatio)) / 2;
        var statusY = (this.gameHeight - (oneOfThisOverlay.height * optimalRatio)) / 2;
        statusCanvas.style.position = 'absolute';
        statusCanvas.style.top = statusY + "px";
        statusCanvas.style.left = statusX + "px";
    };

    PlatformerGame.prototype.ResetOverlayCanvas = function () {
        this.DestroyStatusCanvas();
        this.SetOverlayCanvas();
    };

    // Cleaning the previous overlay canvas and setting it visible
    // with the new overlay image
    PlatformerGame.prototype.ShowStatusCanvas = function (status) {
        statusCanvas.style.display = "block";
        statusCanvasCtx.clearRect(0, 0, status.width, status.height);
        statusCanvasCtx.drawImage(status, 0, 0, oneOfThisOverlay.width * optimalRatio, oneOfThisOverlay.height * optimalRatio);
        overlayEnabled = false;
    };

    // Hiding the overlay canvas while playing the game
    PlatformerGame.prototype.HideStatusCanvas = function () {
        overlayEnabled = true;
        statusCanvas.style.display = "none";
    };

    // Hiding the overlay canvas while playing the game
    PlatformerGame.prototype.DestroyStatusCanvas = function () {
        statusCanvas.setAttribute('width', 0);
        statusCanvas.setAttribute('height', 0);
        overlayEnabled = false;
        statusCanvas.style.display = "none";
        document.body.removeChild(statusCanvas);
    };

    // Loading the next level contained into /level/{x}.txt
    PlatformerGame.prototype.LoadNextLevel = function () {
        this.levelIndex = (this.levelIndex + 1) % numberOfLevels;

        // Searching where we are currently hosted
        var nextFileName = "assets/levels/" + this.levelIndex + ".txt";
        try {
            var instance = this;
            window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, gotFS, fail);

            function gotFS(fileSystem) {
                fileSystem.root.getFile(nextFileName, null, gotFileEntry, fail);
            }

            function gotFileEntry(fileEntry) {
                fileEntry.file(gotFile, fail);
            }

            function gotFile(file) {
                readAsText(file);
            }

            function readAsText(file) {
                var reader = new FileReader();
                reader.onloadend = function (evt) {
                    instance.LoadThisTextLevel(evt.target.result.replace(/[\n\r\t]/g, ''));
                };
                reader.readAsText(file);
            }

            function fail(evt) {
                 console.log(evt.target.error.code)
            }
        }
        catch (e) {
            console.log("Error loading level: " + e.message);
            // Probably an access denied if you try to run from the file:// context
            // Loading the hard coded error level to have at least something to play with
            //this.LoadThisTextLevel(hardcodedErrorTextLevel);
            this.LoadThisTextLevel(hardcodedLevel[this.levelIndex]);
        }
    };

    PlatformerGame.prototype.LoadThisTextLevel = function (textLevel) {
        this.HideStatusCanvas();
        scoreText = null;

        // Unloads the content for the current level before loading the next one.
        if (this.level != null)
            this.level.Dispose();

        this.level = new Level(this.platformerGameStage, this.platformerGameContentManager, textLevel, this.gameWidth, this.gameHeight, this.scaleToFitX, this.scaleToFitY);
        this.level.StartLevel();
    };

    // Loaded if the hero lost because of a timeout
    PlatformerGame.prototype.ReloadCurrentLevel = function () {
        --this.levelIndex;
        this.LoadNextLevel();
    };

    PlatformerGame.prototype.handleKeyDown = function (e) {
        //cross browser issues exist
        if (!e) { var e = window.event; }
        switch (e.keyCode) {
            case KEYCODE_LEFT:
                this.level.IsKeyPressed = true;
                this.level.Hero.direction = -1;
                break;
            case KEYCODE_RIGHT:
                this.level.Hero.IsKeyPressed = true;
                this.level.Hero.direction = 1;
                break;
            case KEYCODE_W:
                this.level.Hero.isJumping = true;
                this.continuePressed = true;
            case KEYCODE_A:
                this.HeroState = this.level.Hero.SaveState();
                break;
            case KEYCODE_D: ;
                this.level.Hero.RestoreState(JSON.parse(this.HeroState))
                break;
        }
    };

    PlatformerGame.prototype.handleKeyUp = function (e) {
        //cross browser issues exist
        if (!e) { var e = window.event; }
        switch (e.keyCode) {
            case KEYCODE_LEFT: ;
            case KEYCODE_RIGHT:
                this.level.Hero.IsKeyPressed = false;
                this.level.Hero.direction = 0;
                break;
            case KEYCODE_W:
                this.continuePressed = false;
                break;
        }
    };

    window.PlatformerGame = PlatformerGame;
} (window));