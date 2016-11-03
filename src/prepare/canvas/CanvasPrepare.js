import * as core from '../../core';
import BasePrepare from '../BasePrepare';

const CANVAS_START_SIZE = 16;

/**
 * The prepare manager provides functionality to upload content to the GPU
 * This cannot be done directly for Canvas like in WebGL, but the effect can be achieved by drawing
 * textures to an offline canvas.
 * This draw call will force the texture to be moved onto the GPU.
 *
 * @class
 * @memberof PIXI
 */
export default class CanvasPrepare extends BasePrepare
{
    /**
     * @param {PIXI.CanvasRenderer} renderer - A reference to the current renderer
     */
    constructor(renderer)
    {
        super(renderer);

        this.uploadHookSource = this;

        /**
        * An offline canvas to render textures to
        * @type {HTMLCanvasElement}
        * @private
        */
        this.canvas = document.createElement('canvas');
        this.canvas.width = CANVAS_START_SIZE;
        this.canvas.height = CANVAS_START_SIZE;

        /**
         * The context to the canvas
        * @type {CanvasRenderingContext2D}
        * @private
        */
        this.ctx = this.canvas.getContext('2d');

        // Add textures to upload
        this.register(findBaseTextures, uploadBaseTextures);
    }

    /**
     * Destroys the plugin, don't use after this.
     *
     */
    destroy()
    {
        super.destroy();
        this.ctx = null;
        this.canvas = null;
    }

}

/**
 * Built-in hook to upload PIXI.Texture objects to the GPU.
 *
 * @private
 * @param {*} prepare - Instance of CanvasPrepare
 * @param {*} item - Item to check
 * @return {boolean} If item was uploaded.
 */
function uploadBaseTextures(prepare, item)
{
    if (item instanceof core.BaseTexture)
    {
        const image = item.source;

        // Sometimes images (like atlas images) report a size of zero, causing errors on windows phone.
        // So if the width or height is equal to zero then use the canvas size
        // Otherwise use whatever is smaller, the image dimensions or the canvas dimensions.
        const imageWidth = image.width === 0 ? prepare.canvas.width : Math.min(prepare.canvas.width, image.width);
        const imageHeight = image.height === 0 ? prepare.canvas.height : Math.min(prepare.canvas.height, image.height);

        // Only a small subsections is required to be drawn to have the whole texture uploaded to the GPU
        // A smaller draw can be faster.
        prepare.ctx.drawImage(image, 0, 0, imageWidth, imageHeight, 0, 0, prepare.canvas.width, prepare.canvas.height);

        return true;
    }

    return false;
}

/**
 * Built-in hook to find textures from Sprites.
 *
 * @private
 * @param {PIXI.DisplayObject} item  -Display object to check
 * @param {Array<*>} queue - Collection of items to upload
 * @return {boolean} if a PIXI.Texture object was found.
 */
function findBaseTextures(item, queue)
{
    // Objects with textures, like Sprites/Text
    if (item instanceof core.BaseTexture)
    {
        if (queue.indexOf(item) === -1)
        {
            queue.push(item);
        }

        return true;
    }
    else if (item._texture && item._texture instanceof core.Texture)
    {
        const texture = item._texture.baseTexture;

        if (queue.indexOf(texture) === -1)
        {
            queue.push(texture);
        }

        return true;
    }

    return false;
}

core.CanvasRenderer.registerPlugin('prepare', CanvasPrepare);
