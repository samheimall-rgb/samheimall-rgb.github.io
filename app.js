const photoInput = document.getElementById("photoInput");
const photoPreview = document.getElementById("photoPreview");
const emptyState = document.getElementById("emptyState");
const sampleCanvas = document.getElementById("sampleCanvas");
const crosshair = document.getElementById("crosshair");
const colorSwatch = document.getElementById("colorSwatch");
const colorName = document.getElementById("colorName");
const hexValue = document.getElementById("hexValue");
const copyButton = document.getElementById("copyButton");
const statusMessage = document.getElementById("statusMessage");
const photoHint = document.getElementById("photoHint");
const cameraButton = document.getElementById("cameraButton");
const cameraArea = document.getElementById("cameraArea");
const cameraVideo = document.getElementById("cameraVideo");
const captureButton = document.getElementById("captureButton");
const closeCameraButton = document.getElementById("closeCameraButton");

const ctx = sampleCanvas.getContext("2d", { willReadFrequently: true });

let currentStream = null;
let currentHex = "";
let objectUrl = null;


// ===============================
// PHOTO UPLOAD / CAMERA CAPTURE
// ===============================

photoInput.addEventListener("change", () => {
  const file = photoInput.files && photoInput.files[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    setStatus("Please choose an image file.");
    return;
  }

  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
  }

  objectUrl = URL.createObjectURL(file);

  photoPreview.onload = () => {
    photoPreview.hidden = false;
    emptyState.hidden = true;
    crosshair.hidden = true;

    photoHint.textContent =
      "Tap or click the part of the photo whose color you want to identify.";

    setStatus("Photo ready. Tap a spot to sample its color.");

    resetResult();
  };

  photoPreview.onerror = () => {
    setStatus(
      "That image couldn't be opened. Please try another photo."
    );
  };

  photoPreview.src = objectUrl;

  stopCamera();
});


// ===============================
// CLICK IMAGE TO IDENTIFY COLOR
// ===============================

photoPreview.addEventListener("click", (event) => {
  if (photoPreview.hidden || !photoPreview.naturalWidth) {
    return;
  }

  const rect = photoPreview.getBoundingClientRect();

  // Convert the clicked screen position
  // into the actual image's pixel coordinates.
  const scaleX = photoPreview.naturalWidth / rect.width;
  const scaleY = photoPreview.naturalHeight / rect.height;

  const x = Math.max(
    0,
    Math.min(
      photoPreview.naturalWidth - 1,
      Math.floor((event.clientX - rect.left) * scaleX)
    )
  );

  const y = Math.max(
    0,
    Math.min(
      photoPreview.naturalHeight - 1,
      Math.floor((event.clientY - rect.top) * scaleY)
    )
  );

  // Draw the image onto a hidden canvas.
  sampleCanvas.width = photoPreview.naturalWidth;
  sampleCanvas.height = photoPreview.naturalHeight;

  ctx.drawImage(photoPreview, 0, 0);

  // Get the RGB values of the selected pixel.
  const pixel = ctx.getImageData(x, y, 1, 1).data;

  const r = pixel[0];
  const g = pixel[1];
  const b = pixel[2];

  showColor(r, g, b);

  // Move the crosshair to the selected location.
  const wrapRect =
    document.getElementById("previewWrap").getBoundingClientRect();

  crosshair.style.left =
    `${event.clientX - wrapRect.left}px`;

  crosshair.style.top =
    `${event.clientY - wrapRect.top}px`;

  crosshair.hidden = false;

  setStatus("Color sampled from the selected spot.");
});


// ===============================
// OPEN LIVE CAMERA
// ===============================

cameraButton.addEventListener("click", openCamera);

async function openCamera() {
  // Check whether the browser supports camera access.
  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {
    setStatus(
      "Live camera isn't available in this browser. Try choosing or taking a photo instead."
    );

    return;
  }

  try {
    stopCamera();

    // Ask the user for camera access.
    currentStream =
      await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: "environment"
          }
        },
        audio: false
      });

    cameraVideo.srcObject = currentStream;

    cameraArea.hidden = false;

    cameraButton.textContent = "Camera is open";

    setStatus(
      "Camera is on. Point it at an object and take a photo."
    );

    await cameraVideo.play();

  } catch (error) {

    if (
      error.name === "NotAllowedError" ||
      error.name === "PermissionDeniedError"
    ) {

      setStatus(
        "Camera permission was denied. Allow camera access in your browser settings, or choose a photo."
      );

    } else if (error.name === "NotFoundError") {

      setStatus(
        "No camera was found. You can still choose a photo."
      );

    } else {

      setStatus(
        "Couldn't open the camera. Make sure the page uses HTTPS and try choosing a photo."
      );
    }
  }
}


// ===============================
// CLOSE CAMERA
// ===============================

closeCameraButton.addEventListener("click", () => {
  stopCamera();
});

function stopCamera() {

  if (currentStream) {

    currentStream
      .getTracks()
      .forEach(track => track.stop());

    currentStream = null;
  }

  cameraVideo.srcObject = null;

  cameraArea.hidden = true;

  cameraButton.textContent = "Open live camera";
}


// ===============================
// TAKE PHOTO FROM LIVE CAMERA
// ===============================

captureButton.addEventListener("click", () => {

  if (
    !cameraVideo.videoWidth ||
    !cameraVideo.videoHeight
  ) {

    setStatus(
      "Please wait for the camera preview to appear."
    );

    return;
  }

  // Set the canvas size to match the camera.
  sampleCanvas.width = cameraVideo.videoWidth;
  sampleCanvas.height = cameraVideo.videoHeight;

  // Draw the camera image onto the canvas.
  ctx.drawImage(
    cameraVideo,
    0,
    0,
    sampleCanvas.width,
    sampleCanvas.height
  );

  // Convert the canvas image into an image URL.
  const imageData =
    sampleCanvas.toDataURL("image/jpeg", 0.92);

  photoPreview.onload = () => {

    photoPreview.hidden = false;

    emptyState.hidden = true;

    crosshair.hidden = true;

    photoHint.textContent =
      "Tap or click the part of the photo whose color you want to identify.";

    resetResult();

    setStatus(
      "Photo captured. Tap a spot in the photo to identify its color."
    );
  };

  photoPreview.src = imageData;

  stopCamera();
});


// ===============================
// DISPLAY COLOR RESULT
// ===============================

function showColor(r, g, b) {

  // Convert RGB to HEX.
  currentHex =
    "#" +
    [r, g, b]
      .map(value =>
        value.toString(16).padStart(2, "0")
      )
      .join("")
      .toUpperCase();

  // Change the color swatch.
  colorSwatch.style.background = currentHex;

  colorSwatch.setAttribute(
    "aria-label",
    `Selected color ${currentHex}`
  );

  // Display the HEX value.
  hexValue.textContent = currentHex;

  // Determine the color's name.
  colorName.textContent =
    getColorName(r, g, b);

  // Enable the copy button.
  copyButton.disabled = false;
}


// ===============================
// RESET COLOR RESULT
// ===============================

function resetResult() {

  currentHex = "";

  colorSwatch.style.background = "";

  colorSwatch.setAttribute(
    "aria-label",
    "No color selected"
  );

  colorName.textContent =
    "No color yet";

  hexValue.textContent =
    "HEX —";

  copyButton.disabled = true;
}


// ===============================
// STATUS MESSAGE
// ===============================

function setStatus(message) {
  statusMessage.textContent = message;
}


// ===============================
// COPY HEX CODE
// ===============================

copyButton.addEventListener("click", async () => {

  if (!currentHex) {
    return;
  }

  try {

    await navigator.clipboard.writeText(
      currentHex
    );

    setStatus(
      `${currentHex} copied to clipboard.`
    );

  } catch {

    setStatus(
      `Color code: ${currentHex}. You can select and copy it manually.`
    );
  }
});


// ===============================
// COLOR NAME DETECTION
// ===============================
//
// This function takes the RGB values and
// estimates a human-readable color name.
//
// Example:
// RGB(255, 0, 0) → Red
//
// This is NOT AI. It uses mathematical
// color classification rules.
//

function getColorName(r, g, b) {

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  const delta = max - min;

  const lightness =
    (max + min) / 2;

  const saturation =
    max === 0
      ? 0
      : delta / max;


  // ===============================
  // BLACK
  // ===============================

  if (max < 35) {
    return "Black";
  }


  // ===============================
  // WHITE
  // ===============================

  if (
    lightness > 0.94 &&
    saturation < 0.12
  ) {
    return "White";
  }


  // ===============================
  // GRAYS
  // ===============================

  if (saturation < 0.12) {

    if (lightness < 0.25) {
      return "Dark gray";
    }

    if (lightness < 0.55) {
      return "Gray";
    }

    return "Light gray";
  }


  // ===============================
  // CALCULATE HUE
  // ===============================

  let hue;

  if (delta === 0) {

    hue = 0;

  } else if (max === r) {

    hue =
      60 *
      (((g - b) / delta) % 6);

  } else if (max === g) {

    hue =
      60 *
      ((b - r) / delta + 2);

  } else {

    hue =
      60 *
      ((r - g) / delta + 4);
  }


  // Make sure hue isn't negative.
  if (hue < 0) {
    hue += 360;
  }


  // ===============================
  // VERY DARK COLORS
  // ===============================

  if (lightness < 0.18) {

    if (
      hue < 45 ||
      hue >= 345
    ) {
      return "Very dark red";
    }

    if (hue < 75) {
      return "Very dark orange";
    }

    if (hue < 165) {
      return "Very dark green";
    }

    if (hue < 260) {
      return "Very dark blue";
    }

    return "Very dark purple";
  }


  // ===============================
  // RED
  // ===============================

  if (
    hue < 15 ||
    hue >= 345
  ) {

    if (lightness > 0.75) {
      return "Pink / rose";
    }

    return "Red";
  }


  // ===============================
  // ORANGE
  // ===============================

  if (hue < 40) {

    if (lightness > 0.72) {
      return "Peach";
    }

    return "Orange";
  }


  // ===============================
  // YELLOW
  // ===============================

  if (hue < 65) {

    if (lightness > 0.72) {
      return "Cream / pale yellow";
    }

    return "Yellow";
  }


  // ===============================
  // YELLOW-GREEN
  // ===============================

  if (hue < 85) {

    if (lightness > 0.55) {
      return "Yellow-green";
    }

    return "Olive";
  }


  // ===============================
  // GREEN
  // ===============================

  if (hue < 160) {

    if (lightness > 0.70) {
      return "Mint green";
    }

    return "Green";
  }


  // ===============================
  // TEAL
  // ===============================

  if (hue < 190) {
    return "Teal";
  }


  // ===============================
  // CYAN / LIGHT BLUE
  // ===============================

  if (hue < 215) {

    if (lightness > 0.70) {
      return "Sky blue";
    }

    return "Cyan / blue";
  }


  // ===============================
  // BLUE
  // ===============================

  if (hue < 250) {
    return "Blue";
  }


  // ===============================
  // PURPLE
  // ===============================

  if (hue < 280) {

    if (lightness > 0.70) {
      return "Lavender";
    }

    return "Purple";
  }


  // ===============================
  // MAGENTA
  // ===============================

  if (hue < 315) {
    return "Magenta";
  }


  // ===============================
  // ROSE / RED-PURPLE
  // ===============================

  if (lightness > 0.65) {
    return "Rose";
  }

  return "Red-purple";
}


// ===============================
// CLEAN UP WHEN PAGE CLOSES
// ===============================

window.addEventListener(
  "beforeunload",
  () => {

    stopCamera();

    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }

  }
);
