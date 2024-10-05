import { unified } from 'unified';
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

window.superinterface = window.superinterface || {};
window.superinterface.publicApiKey = "dc703d26-e6dd-4528-8a2f-2f2ea41af366";
// window.superinterface.assistantId = "3cac8ac7-ca54-4be8-b769-f69cf9174196";
window.superinterface.assistantId = "3f7ef24c-1df7-4118-a785-34079eaf4e43";

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
  const targetElement = window.findElement(searchTerm)
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
      }

      const animateScroll = (currentTime) => {
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1);
        const easedProgress = easeInOutQuad(progress);
        window.scrollTo(0, startY + (distanceY * easedProgress));

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
    const radius = Math.max(targetRect.width, targetRect.height) * 1; // Adjust radius as needed
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
        cursor.style.left = (currentX - window.scrollX) + 'px';
        cursor.style.top = (currentY - window.scrollY) + 'px';
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
  const circleDuration = 2000; // Circling duration in milliseconds
  const circleTotalFrames = (circleDuration / 1000) * fps;
  let circleFrame = 0;

  // Animation loop for circling around the target element
  const animateCircle = (centerX, centerY) => {
    if (circleFrame < circleTotalFrames) {
      const angle = (2 * Math.PI * circleFrame) / circleTotalFrames; // Complete one full circle
      const radius = Math.max(targetElement.getBoundingClientRect().width, targetElement.getBoundingClientRect().height) * 1; // Adjust radius as needed
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      cursor.style.left = (x - window.scrollX) + 'px';
      cursor.style.top = (y - window.scrollY) + 'px';
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
    cursor.style.left = (centerX - window.scrollX) + 'px';
    cursor.style.top = (centerY - window.scrollY) + 'px';

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

window.getContent = async () => {
  const file = await unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeDomParse)
    .use(rehypeRemark)
    .use(remarkGfm)
    .use(remarkStringify)
    .process(window.document.body.innerHTML ?? '');

  const result = String(file)
  console.log({ result })
  return result
}

const root = createRoot(rootElement())

root.render(
  <Providers>
    <ThreadDialog />
  </Providers>
)
