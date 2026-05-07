# YouTube Lecture Capture Extension

A Chrome extension that helps you automatically capture lecture slides from YouTube videos and export them as a single PDF document for easy studying and revision.

---

#  Features

##  Automated Slide Capture
Choose a screenshot interval to automatically capture frames from the lecture video.

### Available Intervals
- 5 seconds
- 10 seconds
- 20 seconds
- 30 seconds

---

## Smart Duplicate Detection
The extension intelligently detects duplicate frames and skips capturing slides that haven't changed.

---

## Gallery View
Review all captured slides in a clean gallery interface.

### Gallery Features
- View captured slides
- See exact video timestamps
- Delete unwanted slides
- Remove transition frames
- Clear the entire gallery

---

## PDF Export
Export all selected slides into a single high-quality landscape PDF document.

Perfect for:
- Exam preparation
- Lecture revision
- Study notes
- Offline access

---

# Technologies Used

- Manifest V3
- HTML
- CSS
- JavaScript
- jsPDF

### Library Used
- [jsPDF](https://github.com/parallax/jsPDF) — Used for client-side PDF generation.

---

 Installation Guide

Since this is an unpacked Chrome extension, you must install it manually using Developer Mode.

---

##  Step 1: Clone or Download the Repository

### Clone Using Git

```bash
git clone https://github.com/yashz0r0/lecture-capture-extension.git
```

### Or Download ZIP
- Click **Code**
- Select **Download ZIP**
- Extract the ZIP file

---

##  Step 2: Open Chrome Extensions

Open Google Chrome and navigate to:

```text
chrome://extensions/
```

---

##  Step 3: Enable Developer Mode

Turn ON the **Developer Mode** toggle located in the top-right corner.

---

##  Step 4: Load the Extension

1. Click **Load unpacked**
2. Select the extracted project folder:

```text
lecture-capture-extension
```

3. The extension will now appear in Chrome.

---

## Step 5: Pin the Extension

1. Click the puzzle icon in Chrome toolbar
2. Locate **YouTube Lecture Capture Extension**
3. Click the  Pin icon

---

# How to Use

## 1️ Open a YouTube Lecture

Go to any YouTube lecture or presentation video.

Examples:
- Online classes
- Tutorials
- PowerPoint presentations
- Educational webinars

---

## 2️ Open the Extension

Click the extension icon from the Chrome toolbar.

---

## 3️ Start Capturing Slides

1. Select a capture interval
2. Click **Start Capture**

The extension will begin automatically taking screenshots.

---

## 4️ Stop Capturing

When finished:

1. Open the extension popup
2. Click **Stop Capture**

---

## 5️ Review Slides

Click **View Gallery** to manage captured slides.

### Inside Gallery
You can:
- View all screenshots
- Check timestamps
- Delete unwanted slides
- Remove transition captures
- Clear the gallery

---

## 6️ Export PDF

Click **Download PDF** to generate your lecture notes PDF.

The generated PDF:
- Combines all slides
- Uses landscape layout
- Maintains image quality
- Is easy to print and study
