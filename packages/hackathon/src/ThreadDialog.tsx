import { unified } from 'unified';
import { visit } from 'unist-util-visit'
import rehypeParse from 'rehype-parse';
import remarkGfm from 'remark-gfm';
import rehypeRemark from 'rehype-remark'
import rehypeDomParse from 'rehype-dom-parse';
import remarkStringify from 'remark-stringify';
import { createRoot } from 'react-dom/client'
import {
  ThreadDialog,
} from '@superinterface/react'
import { rootElement } from '@/lib/rootElement'
import { Providers } from '@/components/Providers'

import { useEffect, useRef, useState } from "react";
import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const facialExpressions = {
  default: {},
  smile: {
    browInnerUp: 0.17,
    eyeSquintLeft: 0.4,
    eyeSquintRight: 0.44,
    noseSneerLeft: 0.1700000727403593,
    noseSneerRight: 0.14000002836874015,
    mouthPressLeft: 0.61,
    mouthPressRight: 0.41000000000000003,
  },
  funnyFace: {
    jawLeft: 0.63,
    mouthPucker: 0.53,
    noseSneerLeft: 1,
    noseSneerRight: 0.39,
    mouthLeft: 1,
    eyeLookUpLeft: 1,
    eyeLookUpRight: 1,
    cheekPuff: 0.9999924982764238,
    mouthDimpleLeft: 0.414743888682652,
    mouthRollLower: 0.32,
    mouthSmileLeft: 0.35499733688813034,
    mouthSmileRight: 0.35499733688813034,
  },
  sad: {
    mouthFrownLeft: 1,
    mouthFrownRight: 1,
    mouthShrugLower: 0.78341,
    browInnerUp: 0.452,
    eyeSquintLeft: 0.72,
    eyeSquintRight: 0.75,
    eyeLookDownLeft: 0.5,
    eyeLookDownRight: 0.5,
    jawForward: 1,
  },
  surprised: {
    eyeWideLeft: 0.5,
    eyeWideRight: 0.5,
    jawOpen: 0.351,
    mouthFunnel: 1,
    browInnerUp: 1,
  },
  angry: {
    browDownLeft: 1,
    browDownRight: 1,
    eyeSquintLeft: 1,
    eyeSquintRight: 1,
    jawForward: 1,
    jawLeft: 1,
    mouthShrugLower: 1,
    noseSneerLeft: 1,
    noseSneerRight: 0.42,
    eyeLookDownLeft: 0.16,
    eyeLookDownRight: 0.16,
    cheekSquintLeft: 1,
    cheekSquintRight: 1,
    mouthClose: 0.23,
    mouthFunnel: 0.63,
    mouthDimpleRight: 1,
  },
  crazy: {
    browInnerUp: 0.9,
    jawForward: 1,
    noseSneerLeft: 0.5700000000000001,
    noseSneerRight: 0.51,
    eyeLookDownLeft: 0.39435766259644545,
    eyeLookUpRight: 0.4039761421719682,
    eyeLookInLeft: 0.9618479575523053,
    eyeLookInRight: 0.9618479575523053,
    jawOpen: 0.9618479575523053,
    mouthDimpleLeft: 0.9618479575523053,
    mouthDimpleRight: 0.9618479575523053,
    mouthStretchLeft: 0.27893590769016857,
    mouthStretchRight: 0.2885543872656917,
    mouthSmileLeft: 0.5578718153803371,
    mouthSmileRight: 0.38473918302092225,
    tongueOut: 0.9618479575523053,
  },
};

const corresponding = {
  A: "viseme_PP",
  B: "viseme_kk",
  C: "viseme_I",
  D: "viseme_AA",
  E: "viseme_O",
  F: "viseme_U",
  G: "viseme_FF",
  H: "viseme_TH",
  X: "viseme_PP",
};

let setupMode = false;

const Avatar = () => {
   const { nodes, materials, scene } = useGLTF(
    "https://models.readyplayer.me/6701bce3b0bb42a82a69ed6c.glb"
  );

  const { animations } = useGLTF("/models/animations.glb")

  const group = useRef();
  const { actions, mixer } = useAnimations(animations, group);
  const [animation, setAnimation] = useState(
    animations.find((a) => a.name === "Idle") ? "Idle" : animations[0].name // Check if Idle animation exists otherwise use first animation
  )

  useEffect(() => {
    actions[animation]
      .reset()
      .fadeIn(mixer.stats.actions.inUse === 0 ? 0 : 0.5)
      .play();
    return () => actions[animation].fadeOut(0.5);
  }, [animation]);

  const lerpMorphTarget = (target, value, speed = 0.1) => {
    scene.traverse((child) => {
      if (child.isSkinnedMesh && child.morphTargetDictionary) {
        const index = child.morphTargetDictionary[target];
        if (
          index === undefined ||
          child.morphTargetInfluences[index] === undefined
        ) {
          return;
        }
        child.morphTargetInfluences[index] = THREE.MathUtils.lerp(
          child.morphTargetInfluences[index],
          value,
          speed
        );

        if (!setupMode) {
          try {
            set({
              [target]: value,
            });
          } catch (e) {}
        }
      }
    });
  };

  const [blink, setBlink] = useState(false);
  const [winkLeft, setWinkLeft] = useState(false);
  const [winkRight, setWinkRight] = useState(false);
  const [facialExpression, setFacialExpression] = useState("");
  const [audio, setAudio] = useState();

  useFrame(() => {
    !setupMode &&
      Object.keys(nodes.EyeLeft.morphTargetDictionary).forEach((key) => {
        const mapping = facialExpressions[facialExpression];
        if (key === "eyeBlinkLeft" || key === "eyeBlinkRight") {
          return; // eyes wink/blink are handled separately
        }
        if (mapping && mapping[key]) {
          lerpMorphTarget(key, mapping[key], 0.1);
        } else {
          lerpMorphTarget(key, 0, 0.1);
        }
      });

    lerpMorphTarget("eyeBlinkLeft", blink || winkLeft ? 1 : 0, 0.5);
    lerpMorphTarget("eyeBlinkRight", blink || winkRight ? 1 : 0, 0.5);

    // LIPSYNC
    if (setupMode) {
      return;
    }

    const appliedMorphTargets = [];
    if (message && lipsync) {
      const currentAudioTime = audio.currentTime;
      for (let i = 0; i < lipsync.mouthCues.length; i++) {
        const mouthCue = lipsync.mouthCues[i];
        if (
          currentAudioTime >= mouthCue.start &&
          currentAudioTime <= mouthCue.end
        ) {
          appliedMorphTargets.push(corresponding[mouthCue.value]);
          lerpMorphTarget(corresponding[mouthCue.value], 1, 0.2);
          break;
        }
      }
    }

    Object.values(corresponding).forEach((value) => {
      if (appliedMorphTargets.includes(value)) {
        return;
      }
      lerpMorphTarget(value, 0, 0.1);
    });
  });

   useEffect(() => {
    let blinkTimeout;
    const nextBlink = () => {
      blinkTimeout = setTimeout(() => {
        setBlink(true);
        setTimeout(() => {
          setBlink(false);
          nextBlink();
        }, 200);
      }, THREE.MathUtils.randInt(1000, 5000));
    };
    nextBlink();
    return () => clearTimeout(blinkTimeout);
  }, []);

  return (
    <group {...props} dispose={null} ref={group}>
      <primitive object={nodes.Hips} />
      <skinnedMesh
        name="Wolf3D_Body"
        geometry={nodes.Wolf3D_Body.geometry}
        material={materials.Wolf3D_Body}
        skeleton={nodes.Wolf3D_Body.skeleton}
      />
      <skinnedMesh
        name="Wolf3D_Outfit_Bottom"
        geometry={nodes.Wolf3D_Outfit_Bottom.geometry}
        material={materials.Wolf3D_Outfit_Bottom}
        skeleton={nodes.Wolf3D_Outfit_Bottom.skeleton}
      />
      <skinnedMesh
        name="Wolf3D_Outfit_Footwear"
        geometry={nodes.Wolf3D_Outfit_Footwear.geometry}
        material={materials.Wolf3D_Outfit_Footwear}
        skeleton={nodes.Wolf3D_Outfit_Footwear.skeleton}
      />
      <skinnedMesh
        name="Wolf3D_Outfit_Top"
        geometry={nodes.Wolf3D_Outfit_Top.geometry}
        material={materials.Wolf3D_Outfit_Top}
        skeleton={nodes.Wolf3D_Outfit_Top.skeleton}
      />
      <skinnedMesh
        name="Wolf3D_Hair"
        geometry={nodes.Wolf3D_Hair.geometry}
        material={materials.Wolf3D_Hair}
        skeleton={nodes.Wolf3D_Hair.skeleton}
      />
      <skinnedMesh
        name="EyeLeft"
        geometry={nodes.EyeLeft.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeLeft.skeleton}
        morphTargetDictionary={nodes.EyeLeft.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeLeft.morphTargetInfluences}
      />
      <skinnedMesh
        name="EyeRight"
        geometry={nodes.EyeRight.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeRight.skeleton}
        morphTargetDictionary={nodes.EyeRight.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeRight.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Head"
        geometry={nodes.Wolf3D_Head.geometry}
        material={materials.Wolf3D_Skin}
        skeleton={nodes.Wolf3D_Head.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Head.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Head.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Teeth"
        geometry={nodes.Wolf3D_Teeth.geometry}
        material={materials.Wolf3D_Teeth}
        skeleton={nodes.Wolf3D_Teeth.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Teeth.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Teeth.morphTargetInfluences}
      />
    </group>
  );
}

window.superinterface = window.superinterface || {};
window.superinterface.publicApiKey = "dc703d26-e6dd-4528-8a2f-2f2ea41af366";
// window.superinterface.assistantId = "3cac8ac7-ca54-4be8-b769-f69cf9174196";
// window.superinterface.assistantId = "3f7ef24c-1df7-4118-a785-34079eaf4e43";
window.superinterface.assistantId = "2fb4c8c7-96eb-44e2-9242-0987d09e5c7e";

// Function to find the target element based on a search term
window.findElement = (searchTerm) => {
  // Select potentially clickable elements
  const clickableElements = document.querySelectorAll('a, button, [role="button"], input[type="button"], input[type="submit"]');

  // Convert NodeList to an array for easier filtering
  const elementsArray = Array.from(clickableElements);

  // Find elements by text content
  const elementsByText = elementsArray.filter(el =>
    el.textContent.trim().toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Find elements by href attribute (for anchor tags)
  const elementsByHref = elementsArray.filter(el =>
    el.tagName.toLowerCase() === 'a' && el.href.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Merge results, prioritize elements found by text content
  const elements = [...elementsByText, ...elementsByHref];

  // If there are no matching elements, exit
  if (elements.length === 0) {
    console.log(`No elements found with text or href containing: ${searchTerm}`);
    return;
  }

  // Choose the best match (the first one in the array)
  return elements[0];
}

// Function to animate the cursor and simulate a click
window.animateClick = (searchTerm) => {
  const targetElement = window.findElement(searchTerm);
  if (!targetElement) {
    console.error('Target element is not provided or does not exist.');
    return;
  }

  // Create a fake cursor element
  const cursor = document.createElement('div');
  cursor.style.width = '48px'; // Made cursor larger
  cursor.style.height = '48px';
  cursor.style.backgroundImage =
    'url(data:image/svg+xml;base64,' +
    btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="3" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.3)" />
        </filter>
      </defs>
      <path d="M3 3 L3 33 L10 25 L16 40 L22 37 L16 22 L32 22 Z" fill="#fff" stroke="#000" stroke-width="1" filter="url(#shadow)"/>
    </svg>
        `) +
    ')';
  cursor.style.backgroundSize = 'contain';
  cursor.style.position = 'fixed'; // Keep position fixed to stay in viewport during scrolling
  cursor.style.pointerEvents = 'none';
  cursor.style.zIndex = '9999';
  cursor.style.transform = 'translate(-24px, -24px)'; // Adjust to align the cursor tip
  cursor.style.transition = 'transform 0.2s ease'; // For click animation

  document.body.appendChild(cursor);

  // Set the cursor to the center of the viewport
  cursor.style.left = '50%';
  cursor.style.top = '50%';

  // Function to scroll smoothly to the target element and center it in the viewport
  const smoothScrollToElement = (element, duration) => {
    return new Promise((resolve, reject) => {
      const elementRect = element.getBoundingClientRect();
      const targetY = window.scrollY + elementRect.top - (window.innerHeight / 2) + (elementRect.height / 2);
      const startY = window.scrollY;
      const distanceY = targetY - startY;
      const startTime = performance.now();

      const easeInOutQuad = (t) => {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      };

      const animateScroll = (currentTime) => {
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1);
        const easedProgress = easeInOutQuad(progress);
        window.scrollTo(0, startY + distanceY * easedProgress);

        if (progress < 1) {
          requestAnimationFrame(animateScroll);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(animateScroll);
    });
  };

  // Start scrolling to the target element
  smoothScrollToElement(targetElement, 1000).then(() => {
    // After scrolling is complete, start the cursor animation
    moveToCircleStart();
  });

  const fps = 60; // Frames per second

  // Function to move the cursor from the starting position to the circle's starting point
  const moveToCircleStart = () => {
    // Calculate the center position of the target element
    const targetRect = targetElement.getBoundingClientRect();
    const centerX = targetRect.left + targetRect.width / 2 + window.scrollX;
    const centerY = targetRect.top + targetRect.height / 2 + window.scrollY;

    // Calculate the starting point of the circle (top of the circle)
    const radius = Math.max(targetRect.width, targetRect.height) / 3; // Radius is 3x smaller
    const circleStartX = centerX + radius * Math.cos(0);
    const circleStartY = centerY + radius * Math.sin(0);

    const moveDuration = 1000; // Duration to move to circle start in milliseconds
    const moveFrames = (moveDuration / 1000) * fps;
    let frame = 0;

    // Starting position is center of viewport
    const startX = window.scrollX + window.innerWidth / 2;
    const startY = window.scrollY + window.innerHeight / 2;

    const deltaX = (circleStartX - startX) / moveFrames;
    const deltaY = (circleStartY - startY) / moveFrames;
    let currentX = startX;
    let currentY = startY;

    const animateMoveToCircleStart = () => {
      if (frame < moveFrames) {
        currentX += deltaX;
        currentY += deltaY;
        // Since cursor is fixed, position relative to viewport is currentX - window.scrollX
        cursor.style.left = currentX - window.scrollX + 'px';
        cursor.style.top = currentY - window.scrollY + 'px';
        frame++;
        requestAnimationFrame(animateMoveToCircleStart);
      } else {
        // Start circling around the target element
        animateCircle(centerX, centerY);
      }
    };

    animateMoveToCircleStart();
  };

  // Animation settings for circling
  const circleDuration = 3000; // Circling duration in milliseconds (faster)
  const circleTotalFrames = (circleDuration / 1000) * fps;
  let circleFrame = 0;

  // Animation loop for circling around the target element
  const animateCircle = (centerX, centerY) => {
    if (circleFrame < circleTotalFrames) {
      const angle = (2 * Math.PI * circleFrame) / circleTotalFrames; // Complete one full circle
      const radius =
        Math.max(
          targetElement.getBoundingClientRect().width,
          targetElement.getBoundingClientRect().height
        ) / 3; // Radius is 3x smaller
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      cursor.style.left = x - window.scrollX + 'px';
      cursor.style.top = y - window.scrollY + 'px';
      circleFrame++;
      requestAnimationFrame(() => animateCircle(centerX, centerY));
    } else {
      // After circling, show click animation
      showClickAnimation(centerX, centerY);
    }
  };

  // Function to show click animation and simulate a click
  const showClickAnimation = (centerX, centerY) => {
    // Move cursor to center of target element
    cursor.style.left = centerX - window.scrollX + 'px';
    cursor.style.top = centerY - window.scrollY + 'px';

    // Click animation: scale cursor down and back up
    cursor.style.transition = 'transform 0.1s ease';
    cursor.style.transform = 'translate(-24px, -24px) scale(0.8)';

    setTimeout(() => {
      cursor.style.transform = 'translate(-24px, -24px) scale(1.2)';
      setTimeout(() => {
        cursor.style.transform = 'translate(-24px, -24px) scale(1)';
        setTimeout(() => {
          // Remove the fake cursor
          document.body.removeChild(cursor);

          // Simulate a click on the target element
          const event = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: centerX - window.scrollX,
            clientY: centerY - window.scrollY,
          });
          targetElement.dispatchEvent(event);
        }, 100);
      }, 100);
    }, 100);
  };
};

window.superEval = ({ code }) => {
  console.log({ code });

  try {
    return eval(code) ?? 'No output';
  } catch(error) {
    return `Error: ${error.message}`
  }
}

window.superClick = async ({ text }) => {
  console.log({ text });

  try {
    const result = window.animateClick(text) ?? 'Clicked successfully.';
    await new Promise(r => setTimeout(r, 3000));
    return result
  } catch(error) {
    return `Error: ${error.message}`
  }
}

function annotateInputs() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName === 'input') {
        // Extract the placeholder text
        const placeholderText = node.properties.placeholder || '';

        // Escape special characters in placeholderText for CSS selector
        const escapedPlaceholder = placeholderText.replace(/(["\\])/g, '\\$1');

        // Construct the selector string
        const selectorParts = ['input'];

        if (node.properties.id) {
          selectorParts.push(`#${node.properties.id}`);
        }
        if (node.properties.className) {
          selectorParts.push(`.${node.properties.className.join('.')}`);
        }
        if (node.properties.name) {
          selectorParts.push(`[name="${node.properties.name}"]`);
        }
        if (placeholderText) {
          selectorParts.push(`[placeholder="${escapedPlaceholder}"]`);
        }

        const selector = selectorParts.join('');

        // Replace the input node with an inline code node containing the selector
        parent.children[index] = {
          type: 'inlineCode',
          value: `{{input:${selector}}}`,
        };
      }
    });
  };
}

window.getContent = async () => {
  const file = await unified()
    .use(rehypeParse, { fragment: true })
    // .use(addPlaceholdersToInputs)
    .use(annotateInputs)
    .use(() => (tree) => {
      console.log('AST after annotateInputs:', JSON.stringify(tree, null, 2));
    })
    // .use(annotateInputs)
    // .use(rehypeDomParse)
    .use(rehypeRemark)
    .use(remarkGfm)
    .use(remarkStringify)
    .process(window.document.body.innerHTML ?? '');

  const result = String(file)
  console.log({ result })
  return result
}

window.superInput = function({ selector, value }) {
    const input = document.querySelector(selector);
    if (!input) {
        console.error('Input field not found with selector:', selector);
        return;
    }
    let i = 0;

    function createKeyboardEvent(type, key) {
        const event = new KeyboardEvent(type, {
            key: key,
            code: key,
            keyCode: key.charCodeAt(0),
            charCode: key.charCodeAt(0),
            which: key.charCodeAt(0),
            bubbles: true,
            cancelable: true
        });
        return event;
    }

    function typeCharacter() {
        if (i < value.length) {
            const char = value[i];

            // Create and dispatch keydown event
            const keydownEvent = createKeyboardEvent('keydown', char);
            input.dispatchEvent(keydownEvent);

            // Create and dispatch keypress event
            const keypressEvent = createKeyboardEvent('keypress', char);
            input.dispatchEvent(keypressEvent);

            // Update input value
            input.value += char;

            // Create and dispatch input event
            const inputEvent = new Event('input', { bubbles: true });
            input.dispatchEvent(inputEvent);

            // Create and dispatch keyup event
            const keyupEvent = createKeyboardEvent('keyup', char);
            input.dispatchEvent(keyupEvent);

            i++;

            // Schedule next character typing with realistic delay
            const delay = Math.floor(Math.random() * 100) + 50; // 50ms to 150ms delay
            setTimeout(typeCharacter, delay);
        }
    }

    // Start typing
    typeCharacter();
    return 'Input successful';
};

const root = createRoot(rootElement())

    // <Avatar />
root.render(
  <Providers>
    <ThreadDialog />
  </Providers>
)
