# Standalone bundle example with videos & audio

This is an example of a custom setup that exports a standalone JavaScript bundle with markdown video and audio support.

Markdown video follows classic image syntax with video being detected by the file extension. For example, `![video](/video.mp4)`.

Audio is similar to video, but with the audio file extension. For example, `![audio](/audio.mp3)`.

## Getting Started

Install the dependencies:

```bash
npm install
```

Then build the project:

```bash
npm run build
```

Then you can open `example.html` in your browser and you’ll see Superinterface embedded in multiple ways.

## Deployment

Once you have built the project, decide what kind of type of Superinterface you want to display.

If it’s inline - use Thread.global.js, if it’s a dialog - use ThreadDialog.global.js. If it’s voice - use AudioThread.global.js.

Then copy the file (for example, Thread.global.js) to your project and include it in your HTML file.

If it’s Thread, by default it will render into the div with id thread-root. You can customize by directly editing Thread.tsx file and then running `npm run build` again.
