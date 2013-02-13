//-----------------------------------------------------------------------------
// Player.js
//
// Inspired by the Microsoft XNA Community Game Platformer Sample
// Copyright (C) Microsoft Corporation. All rights reserved.
// Ported to HTML5 Canvas with EaselJS by David Rousset - http://blogs.msdn.com/davrous
//-----------------------------------------------------------------------------

/// <summary>
/// Our fearless adventurer!
/// </summary>
(function (window) {
    var globalTargetFPS = 17;

    var StaticTile = new Tile(null, Enum.TileCollision.Passable, 0, 0, 2);

    // imgPlayer should be the PNG containing the sprite sequence
    // level must be of type Level
    // position must be of type Point
    function Player(imgPlayer, level, position, scaleToFitX, scaleToFitY) {
        this.initialize(imgPlayer, level, position, scaleToFitX, scaleToFitY);
    }

    // Using EaselJS BitmapSequence as the based prototype
    Player.prototype = new BitmapSequence();

    Player.prototype.IsAlive = true;
    Player.prototype.HasReachedExit = false;

    /// <summary>
    /// Gets whether or not the player's feet are on the ground.
    /// </summary>
    Player.prototype.IsOnGround = true;

    // constructor:
    //unique to avoid overiding base class
    Player.prototype.BitmapSequence_initialize = Player.prototype.initialize;
    Player.prototype.BitmapSequence_tick = Player.prototype.tick;

    /// <summary>
    /// Constructors a new player.
    /// </summary>
    Player.prototype.initialize = function (imgPlayer, level, position, scaleToFitX, scaleToFitY) {
        var localSpriteSheet = new SpriteSheet(
            imgPlayer, //image to use
            64, //width of each sprite
            64, //height of each sprite
            {
            walk_left: [0, 9],
            die_left: [10, 21, false],
            jump_left: [22, 32, false],
            celebrate_left: [33, 43, false],
            idle: [44, 44]
        });

        localSpriteSheet = SpriteSheetUtils.flip(
            localSpriteSheet,
            {
                walk_right: ["walk_left", true, false],
                jump_right: ["jump_left", true, false, false],
                die_right: ["die_left", true, false, false],
                celebrate_right: ["celebrate_left", true, false, false]
            });

        this.BitmapSequence_initialize(localSpriteSheet);
        this.firstRatio = true;
        this.level = level;
        this.position = position;
        this.velocity = new Point(0, 0);
        this.previousBottom = 0.0;
        this.elapsed = 0;

        this.isJumping = false;
        this.wasJumping = false;
        this.jumpTime = 0.0;
        this.IsKeyPressed = false;

        var options = { frequency: 500 };
        var that = this;

        navigator.accelerometer.watchAcceleration(
            function (accelerometer) { that.moveDirectionAccel(accelerometer); },
            function () { console.log("Error with accelerometer"); }, 
            options);

        this.UpdateRatio(scaleToFitX, scaleToFitY);
        this.firstRatio = false;
        this.Reset(position);

        // Setting the registration point in order to draw like XNA
        this.regX = 32;
        this.regY = this.spriteSheet.frameHeight;
        this.InitialSpeedConstant();
        this.AdjustSpeedScaleFit();

        // set up a shadow. Note that shadows are ridiculously expensive. You could display hundreds
        // of animated monster if you disabled the shadow.
        if (enableShadows)
            this.shadow = new Shadow("#000", 3, 2, 2);

        this.name = "Hero";

        // 1 = right & -1 = left & 0 = idle
        this.direction = 0;

        // starting directly at the first frame of the walk_right sequence
        this.currentFrame = 66;
    };

    Player.prototype.moveDirectionAccel = function(acceleration) {
        var accelValue = -acceleration.y;

        // Move the player with accelerometer
        if (Math.abs(accelValue) > 0.15) {
            // set our movement speed
            this.direction = Math.clamp(accelValue * this.AccelerometerScale, -1, 1);
        }
        else {
            this.direction = 0;
        }
    };

    Player.prototype.UpdateRatio = function (scaleToFitX, scaleToFitY) {
        if (!this.firstRatio) {
            var oldAbsoluteX = this.x / this.scaleToFitX;
            var oldAbsoluteY = this.y / this.scaleToFitY;
        }

        var width;
        var left;
        var height;
        var top;

        this.scaleToFitX = scaleToFitX;
        this.scaleToFitY = scaleToFitY;
        this.scaleX = this.scaleToFitX;
        this.scaleY = this.scaleToFitY;

        // Calculate bounds within texture size.
        width = parseInt(this.spriteSheet.frameWidth * this.scaleToFitX * 0.4);
        left = parseInt((this.spriteSheet.frameWidth * this.scaleToFitX - width) / 2);
        height = parseInt(this.spriteSheet.frameWidth * this.scaleToFitY * 0.8);
        top = parseInt(this.spriteSheet.frameHeight * this.scaleToFitY - height);
        this.localBounds = new XNARectangle(left, top, width, height);

        if (!this.firstRatio) {
            this.x = oldAbsoluteX * this.scaleToFitX;
            this.y = oldAbsoluteY * this.scaleToFitY;

            this.InitialSpeedConstant();
            this.AdjustSpeedScaleFit();
        }
    };

    Player.prototype.InitialSpeedConstant = function () {
        // Constants for controling horizontal movement
        this.MoveAcceleration = 13000.0;
        this.MaxMoveSpeed = 1750.0;
        this.GroundDragFactor = 0.48;
        this.AirDragFactor = 0.58;

        // Constants for controlling vertical movement
        this.MaxJumpTime = 0.35;
        this.JumpLaunchVelocity = -5000.0;
        this.GravityAcceleration = 1800.0;
        this.MaxFallSpeed = 550.0;
        this.JumpControlPower = 0.14;

        this.AccelerometerScale = 3.5;
    };

    Player.prototype.AdjustSpeedScaleFit = function () {
        this.MoveAcceleration *= this.scaleToFitX;
        this.MaxMoveSpeed *= this.scaleToFitX;
        this.MaxJumpTime *= this.scaleToFitY;
        this.JumpLaunchVelocity *= Math.sqrt(this.scaleToFitY);
        this.MaxFallSpeed *= Math.sqrt(this.scaleToFitY);
        this.JumpControlPower *= Math.sqrt(this.scaleToFitY);
    };

    /// <summary>
    /// Resets the player to life.
    /// </summary>
    /// <param name="position">The position to come to life at.</param>
    Player.prototype.Reset = function (position) {
        this.x = position.x;
        this.y = position.y;
        this.velocity = new Point(0, 0);
        this.IsAlive = true;
        this.level.IsHeroDied = false;
        this.gotoAndPlay("idle");
    };

    /// <summary>
    /// Gets a rectangle which bounds this player in world space.
    /// </summary>
    Player.prototype.BoundingRectangle = function () {
        var left = parseInt(Math.round(this.x - 32 * this.scaleToFitX) + this.localBounds.x);
        var top = parseInt(Math.round(this.y - 64 * this.scaleToFitY) + this.localBounds.y);

        return new XNARectangle(left, top, this.localBounds.width, this.localBounds.height);
    };

    /// <summary>
    /// Handles input, performs physics, and animates the player sprite.
    /// </summary>
    /// <remarks>
    /// We pass in all of the input states so that our game is only polling the hardware
    /// once per frame. We also pass the game's orientation because when using the accelerometer,
    /// we need to reverse our motion when the orientation is in the LandscapeRight orientation.
    /// </remarks>
    Player.prototype.tick = function () {
        var that = this;

        // It not possible to have a predictable tick/update time
        // requestAnimationFrame could help but is currently not widely and properly supported by browsers
        // this.elapsed = (Ticker.getTime() - this.lastUpdate) / 1000;
        // We're then forcing/simulating a perfect world
        this.elapsed = globalTargetFPS / 1000;

        this.ApplyPhysics();

        if (this.IsAlive && this.IsOnGround && !this.HasReachedExit) {
            if (Math.abs(this.velocity.x) - 0.02 > 0) {
                // Checking if we're not already playing the animation
                if (this.currentSequence.indexOf("walk_left") === -1 && this.direction < 0) {
                    this.gotoAndPlay("walk_left");
                }
                if (this.currentSequence.indexOf("walk_right") === -1 && this.direction > 0) {
                    this.gotoAndPlay("walk_right");
                }
            }
            else {
                if (this.currentSequence.indexOf("idle") === -1 && this.direction === 0) {
                    this.gotoAndPlay("idle");
                }
            }
        }

        // Clear input.
        this.isJumping = false;

        // To slow down the animation loop of the sprite, we're not redrawing during each tick
        // With a Modulo 4, we're dividing the speed by 4
        var speedControl = Ticker.getTicks() % 4;

        if (speedControl == 0) {
            this.BitmapSequence_tick();
        }
    };

    /// <summary>
    /// Updates the player's velocity and position based on input, gravity, etc.
    /// </summary>
    Player.prototype.ApplyPhysics = function () {
        if (this.IsAlive && !this.HasReachedExit) {
            var previousPosition = new Point(this.x, this.y);

            // Base velocity is a combination of horizontal movement control and
            // acceleration downward due to gravity.
            this.velocity.x += this.direction * this.MoveAcceleration * this.elapsed;
            this.velocity.y = Math.clamp(this.velocity.y + this.GravityAcceleration * this.elapsed, -this.MaxFallSpeed, this.MaxFallSpeed);

            this.velocity.y = this.DoJump(this.velocity.y);

            // Apply pseudo-drag horizontally.
            if (this.IsOnGround) {
                this.velocity.x *= this.GroundDragFactor;
            }
            else {
                this.velocity.x *= this.AirDragFactor;
            }

            // Prevent the player from running faster than his top speed.
            this.velocity.x = Math.clamp(this.velocity.x, -this.MaxMoveSpeed, this.MaxMoveSpeed);

            this.x += this.velocity.x * this.elapsed;
            this.y += this.velocity.y * this.elapsed;
            this.x = Math.round(this.x);
            this.y = Math.round(this.y);

            // If the player is now colliding with the level, separate them.
            this.HandleCollisions();

            // If the collision stopped us from moving, reset the velocity to zero.
            if (this.x === previousPosition.x) {
                this.velocity.x = 0;
            }

            if (this.y === previousPosition.y) {
                this.velocity.y = 0;
            }
        }
    };

    /// <summary>
    /// Calculates the Y velocity accounting for jumping and
    /// animates accordingly.
    /// </summary>
    /// <remarks>
    /// During the accent of a jump, the Y velocity is completely
    /// overridden by a power curve. During the decent, gravity takes
    /// over. The jump velocity is controlled by the jumpTime field
    /// which measures time into the accent of the current jump.
    /// </remarks>
    /// <param name="velocityY">
    /// The player's current velocity along the Y axis.
    /// </param>
    /// <returns>
    /// A new Y velocity if beginning or continuing a jump.
    /// Otherwise, the existing Y velocity.
    /// </returns>
    Player.prototype.DoJump = function (velocityY) {
        // If the player wants to jump
        if (this.isJumping) {
            // Begin or continue a jump
            if ((!this.wasJumping && this.IsOnGround) || this.jumpTime > 0.0) {
                if (this.jumpTime == 0.0) {
                    this.level.levelContentManager.playerJump.play();
                }

                this.jumpTime += this.elapsed;
                // Playing the proper animation based on
                // the current direction of our hero
                if (this.direction > 0) {
                    this.gotoAndPlay("jump_right");
                }
                else {
                    this.gotoAndPlay("jump_left");
                }
            }

            // If we are in the ascent of the jump
            if (0.0 < this.jumpTime && this.jumpTime <= this.MaxJumpTime) {
                // Fully override the vertical velocity with a power curve that gives players more control over the top of the jump
                velocityY = this.JumpLaunchVelocity * (1.0 - Math.pow(this.jumpTime / this.MaxJumpTime, this.JumpControlPower));
            }
            else {
                // Reached the apex of the jump
                this.jumpTime = 0.0;
            }
        }
        else {
            // Continues not jumping or cancels a jump in progress
            this.jumpTime = 0.0;
        }
        this.wasJumping = this.isJumping;

        return velocityY;
    };

    /// <summary>
    /// Detects and resolves all collisions between the player and his neighboring
    /// tiles. When a collision is detected, the player is pushed away along one
    /// axis to prevent overlapping. There is some special logic for the Y axis to
    /// handle platforms which behave differently depending on direction of movement.
    /// </summary>
    Player.prototype.HandleCollisions = function () {
        var bounds = this.BoundingRectangle();
        var leftTile = Math.floor(bounds.Left() / (StaticTile.Width * this.scaleToFitX));
        var rightTile = Math.ceil((bounds.Right() / (StaticTile.Width * this.scaleToFitX))) - 1;
        var topTile = Math.floor(bounds.Top() / (StaticTile.Height * this.scaleToFitY));
        var bottomTile = Math.ceil((bounds.Bottom() / (StaticTile.Height * this.scaleToFitY))) - 1;

        // Reset flag to search for ground collision.
        this.IsOnGround = false;

        // For each potentially colliding tile,
        for (var y = topTile; y <= bottomTile; ++y) {
            for (var x = leftTile; x <= rightTile; ++x) {
                // If this tile is collidable,
                var collision = this.level.GetCollision(x, y);
                if (collision !== Enum.TileCollision.Passable) {
                    // Determine collision depth (with direction) and magnitude.
                    var tileBounds = this.level.GetBounds(x, y);
                    var depth = bounds.GetIntersectionDepth(tileBounds);
                    if (depth.x !== 0 && depth.y !== 0) {
                        var absDepthX = Math.abs(depth.x);
                        var absDepthY = Math.abs(depth.y);

                        // Resolve the collision along the shallow axis.
                        if (absDepthY < absDepthX || collision == Enum.TileCollision.Platform) {
                            // If we crossed the top of a tile, we are on the ground.
                            if (this.previousBottom <= tileBounds.Top()) {
                                this.IsOnGround = true;
                            }

                            // Ignore platforms, unless we are on the ground.
                            if (collision == Enum.TileCollision.Impassable || this.IsOnGround) {
                                // Resolve the collision along the Y axis.
                                this.y = this.y + depth.y;

                                // Perform further collisions with the new bounds.
                                bounds = this.BoundingRectangle();
                            }
                        }
                        else if (collision == Enum.TileCollision.Impassable) // Ignore platforms.
                        {
                            // Resolve the collision along the X axis.
                            this.x = this.x + depth.x;

                            // Perform further collisions with the new bounds.
                            bounds = this.BoundingRectangle();
                        }
                    }
                }
            }
        }

        // Save the new bounds bottom.
        this.previousBottom = bounds.Bottom();
    };

    /// <summary>
    /// Called when the player has been killed.
    /// </summary>
    /// <param name="killedBy">
    /// The enemy who killed the player. This parameter is null if the player was
    /// not killed by an enemy (fell into a hole).
    /// </param>
    Player.prototype.OnKilled = function (killedBy) {
        this.IsAlive = false;
        this.velocity = new Point(0, 0);

        // Playing the proper animation based on
        // the current direction of our hero
        if (this.direction === 1) {
            this.gotoAndPlay("die_right");
        }
        else {
            this.gotoAndPlay("die_left");
        }

        if (killedBy !== null && killedBy !== undefined) {
            this.level.levelContentManager.playerKilled.play();
        }
        else {
            this.level.levelContentManager.playerFall.play();
        }
    };

    /// <summary>
    /// Called when this player reaches the level's exit.
    /// </summary>
    Player.prototype.OnReachedExit = function () {
        this.HasReachedExit = true;
        this.level.levelContentManager.exitReached.play();

        // Playing the proper animation based on
        // the current direction of our hero
        if (this.direction === 1) {
            this.gotoAndPlay("celebrate_right");
        }
        else {
            this.gotoAndPlay("celebrate_left");
        }
    };

    window.Player = Player;
} (window));