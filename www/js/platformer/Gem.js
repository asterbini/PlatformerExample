//-----------------------------------------------------------------------------
// Gem.js
//
// Inspired by the Microsoft XNA Community Game Platformer Sample
// Copyright (C) Microsoft Corporation. All rights reserved.
// Ported to HTML5 Canvas with EaselJS by David Rousset - http://blogs.msdn.com/davrous
//-----------------------------------------------------------------------------

/// <summary>
/// A valuable item the player can collect.
/// </summary>
(function (window) {
    var localBounds;
    
    // Bounce control constants
    var BounceHeight = 0.18;
    var BounceRate = 3.0;
    var BounceSync = -0.75;

    function Gem(texture, level, position, scaleToFitX, scaleToFitY) {
        this.initialize(texture, level, position, scaleToFitX, scaleToFitY);
    }
    Gem.prototype = new BitmapSequence();

    // constructor:
    //unique to avoid overiding base class
    Gem.prototype.BitmapSequence_initialize = Gem.prototype.initialize; 

    Gem.prototype.initialize = function (texture, level, position, scaleToFitX, scaleToFitY) {
        var localSpriteSheet = new SpriteSheet(
            texture, //image to use
            32, //width of each sprite
            32, //height of each sprite
            {
            gem: [0, 0]
        });

        this.BitmapSequence_initialize(localSpriteSheet);
        this.gotoAndPlay("gem");
        this.level = level;
        this.position = position;
        this.UpdateRatio(scaleToFitX, scaleToFitY);
        
        if (enableShadows)
            this.shadow = new Shadow("#000", 3, 2, 2);
    };

    Gem.prototype.UpdateRatio = function (scaleToFitX, scaleToFitY) {
        var width;
        var left;
        var height;
        var top;

        this.scaleToFitX = scaleToFitX;
        this.scaleToFitY = scaleToFitY;
        this.x = this.position.x * 40 * scaleToFitX;
        this.y = this.position.y * 32 * scaleToFitY;
        this.scaleY = this.scaleToFitX;
        this.scaleX = this.scaleToFitY;

        width = this.spriteSheet.frameWidth * scaleToFitX * 0.8;
        left = (this.spriteSheet.frameWidth * scaleToFitX) / 2;
        height = this.spriteSheet.frameWidth * scaleToFitY * 0.8;
        top = (this.spriteSheet.frameHeight * scaleToFitY) - height;
        localBounds = new XNARectangle(left, top, width, height);

        // The gem is animated from a base position along the Y axis.
        this.basePosition = new Point(this.x, this.y);
    };

    Gem.prototype.PointValue = 30;

    /// <summary>
    /// Bounces up and down in the air to entice players to collect them.
    /// </summary>
    Gem.prototype.BoundingRectangle = function () {
        var left = Math.round(this.x) + localBounds.x;
        var top = Math.round(this.y) + localBounds.y;

        return new XNARectangle(left, top, localBounds.width, localBounds.height);
    };

    /// <summary>
    /// Bounces up and down in the air to entice players to collect them.
    /// </summary>
    Gem.prototype.tick = function () {
        // Bounce along a sine curve over time.
        // Include the X coordinate so that neighboring gems bounce in a nice wave pattern.  
        var t = (Ticker.getTime() / 1000) * BounceRate + this.x * BounceSync;
        var bounce = Math.sin(t) * BounceHeight * 32;
        this.y = this.basePosition.y + bounce;
    };

    window.Gem = Gem;
} (window));