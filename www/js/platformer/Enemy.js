//-----------------------------------------------------------------------------
// Enemy.js
//
// Inspired by the Microsoft XNA Community Game Platformer Sample
// Copyright (C) Microsoft Corporation. All rights reserved.
// Ported to HTML5 Canvas with EaselJS by David Rousset - http://blogs.msdn.com/davrous
//-----------------------------------------------------------------------------

/// <summary>
/// A monster who is impeding the progress of our fearless adventurer.
/// </summary>
(function (window) {
    /// <summary>
    /// How long to wait before turning around.
    /// </summary>
    var MaxWaitTime = 0.5;

    // Local bounds used to calculate collision between enemies and the hero
    var localBounds;

    // Index used for the naming of the monsters
    var monsterIndex = 0;

    var globalTargetFPS = 17;

    var StaticTile = new Tile(null, Enum.TileCollision.Passable, 0, 0, 2);

    function Enemy(level, position, imgMonster, scaleToFitX, scaleToFitY) {
        this.initialize(level, position, imgMonster, scaleToFitX, scaleToFitY);
    };

    Enemy.prototype = new BitmapSequence();

    // constructor:
    Enemy.prototype.BitmapSequence_initialize = Enemy.prototype.initialize;
    Enemy.prototype.BitmapSequence_tick = Enemy.prototype.tick;

    Enemy.prototype.initialize = function (level, position, imgMonster, scaleToFitX, scaleToFitY) {
        var localSpriteSheet = new SpriteSheet(
            imgMonster, //image to use
            64, //width of each sprite
            64, //height of each sprite
            {
            walk_left: [0, 9],
            idle: [10, 20]
        });

        localSpriteSheet = SpriteSheetUtils.flip(
            localSpriteSheet,
            {
                walk_right: ["walk_left", true, false]
            });

        this.BitmapSequence_initialize(localSpriteSheet);
        this.firstRatio = true;
        this.x = position.x;
        this.y = position.y;
        this.level = level;

        /// <summary>
        /// How long this enemy has been waiting before turning around.
        /// </summary>
        this.waitTime = 0;

        // Setting the registration point to draw like the XNA Platformer sample does
        this.regX = 32;
        this.regY = this.spriteSheet.frameHeight;

        this.UpdateRatio(scaleToFitX, scaleToFitY);
        this.firstRatio = false;

        // start playing the first sequence:
        this.gotoAndPlay("walk_right"); //animate

        // set up a shadow. Note that shadows are ridiculously expensive. You could display hundreds
        // of animated monster if you disabled the shadow.
        if (enableShadows)
            this.shadow = new Shadow("#000", 3, 2, 2);

        this.name = "Monster" + monsterIndex;
        monsterIndex++;

        /// <summary>
        /// The direction this enemy is facing and moving along the X axis.
        /// </summary>
        // 1 = right & -1 = left
        this.direction = 1;
        // starting directly at the first frame of the walk_right sequence
        this.currentFrame = 21;
    };

    Enemy.prototype.UpdateRatio = function (scaleToFitX, scaleToFitY) {
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

        /// <summary>
        /// The speed at which this enemy moves along the X axis.
        /// </summary>
        this.MoveSpeed = 64.0 * this.scaleToFitX;

        // Calculate bounds within texture size.
        width = parseInt(this.spriteSheet.frameWidth * this.scaleToFitX * 0.35);
        left = parseInt((this.spriteSheet.frameWidth * this.scaleToFitX - width) / 2);
        height = parseInt(this.spriteSheet.frameWidth * this.scaleToFitY * 0.7);
        top = parseInt(this.spriteSheet.frameHeight * this.scaleToFitY - height);

        localBounds = new XNARectangle(left, top, width, height);

        if (!this.firstRatio) {
            this.x = oldAbsoluteX * this.scaleToFitX;
            this.y = oldAbsoluteY * this.scaleToFitY;
        }
    };

    /// <summary>
    /// Gets a rectangle which bounds this enemy in world space.
    /// </summary>
    Enemy.prototype.BoundingRectangle = function () {
        var left = parseInt(Math.round(this.x - 32 * this.scaleToFitX) + localBounds.x);
        var top = parseInt(Math.round(this.y - 64 * this.scaleToFitY) + localBounds.y);

        return new XNARectangle(left, top, localBounds.width, localBounds.height);
    };

    /// <summary>
    /// Paces back and forth along a platform, waiting at either end.
    /// </summary>
    Enemy.prototype.tick = function () {
        // We should normaly try here to compute the elpsed time since
        // the last update. But setTimeout/setTimer functions
        // are not predictable enough to do that. requestAnimationFrame will
        // help when the spec will be stabilized and used properly by all major browsers
        // In the meantime, we're cheating... and living in a perfect 60 FPS world ;-)
        var elapsed = globalTargetFPS / 1000;

        // To slow down the animation loop of the sprite, we're not redrawing during each tick
        // With a Modulo 4, we're dividing the speed by 4
        var speedControl = Ticker.getTicks() % 4;

        if (speedControl == 0) {
            this.BitmapSequence_tick();
        }

        var posX = this.x + (localBounds.width / 2) * this.direction;
        var tileX = Math.floor(posX / (StaticTile.Width * this.scaleToFitX)) - this.direction;
        var tileY = Math.round(this.y / (StaticTile.Height * this.scaleToFitY));

        if (this.waitTime > 0) {
            // Wait for some amount of time.
            this.waitTime = Math.max(0.0, this.waitTime - elapsed);
            if (this.waitTime <= 0.0 && !this.level.IsHeroDied && !this.level.ReachedExit) {
                // Then turn around.
                this.direction = -this.direction;
                if (this.direction === 1) {
                    this.gotoAndPlay("walk_right"); //animate
                }
                else {
                    this.gotoAndPlay("walk_left"); //animate
                }

            }
        }
        else {
            // If we are about to run into a wall or off a cliff, start waiting.
            if (this.level.GetCollision(tileX + this.direction, tileY - 1) === Enum.TileCollision.Impassable
                || this.level.GetCollision(tileX + this.direction, tileY) === Enum.TileCollision.Passable
                || this.level.IsHeroDied || this.level.ReachedExit) {
                this.waitTime = MaxWaitTime;
                if (this.currentSequence.indexOf("idle") === -1) {
                    this.gotoAndPlay("idle");
                }
            }
            else {
                // Move in the current direction.
                var velocity = this.direction * this.MoveSpeed * elapsed;
                this.x = this.x + velocity;
            }
        }
    };

    window.Enemy = Enemy;
} (window));