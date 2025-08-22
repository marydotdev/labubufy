Prompt 1

I would like to create concise functional requirements for the following application:

The app is called Labubfy and is an AI photo generator that let's users create a photo of them holding a labubu doll.

The user uploads a photo of themselves, selects a labubu, and then generates the image. Refer to the included images to understand how the ai image generation pipeline works.

The target audience is young people going back to school who want to post a pic of them with a labubu on social media. The app is a simple website and should be easy to use and beautifully designed.


My Requirements:
- There is already a codebase setup using Next.js app router, Tailwindcss, and Lucide icons.

- It integrates with replicate to run the image merge tool and then the qwen image edit model.
- zsxkib/tool-merge-images:d933c8352ca7270ddf7c9c816e1c872f6114675ce43c8d70c924a3347bbeef05 - https://replicate.com/zsxkib/tool-merge-images
- qwen/qwen-image-edit - https://replicate.com/qwen/qwen-image-edit
- The user uploads and/or take a selfie/photo to use, should work on desktop and mobile
- The user selects a labubu from the options
- The user clicks the generate button, loading is indicated on the button and uploaded image while the user waits to get the generated image back
- generated image replaces uploaded image
- option to share image or download it to desktop or mobile
- generated images are saved in the browser and a history of generated photos is accessible for users to be able to see and redownload previously generated images
- easy to clear and generate a new image

Output as markdown code.

Output 1

# Labubufy - Functional Requirements Document

## 1. Overview
**Application Name:** Labubufy
**Purpose:** AI-powered photo generator that creates images of users holding Labubu dolls
**Target Audience:** Young people, particularly students, who want to share trendy Labubu photos on social media
**Platform:** Responsive web application (desktop and mobile)

## 2. Technical Stack
- **Framework:** Next.js with App Router
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **AI Integration:** Replicate API
  - Image Merge: `zsxkib/tool-merge-images:d933c8352ca7270ddf7c9c816e1c872f6114675ce43c8d70c924a3347bbeef05`
  - Image Edit: `qwen/qwen-image-edit`

## 3. Core Features

### 3.1 Photo Input
- **Upload Option:** Users can upload an existing photo from their device
- **Camera Option:** Users can take a selfie/photo directly using device camera
- **Supported Formats:** JPEG, PNG, WebP, HEIC
- **Mobile Responsive:** Full functionality on both desktop and mobile devices
- **Preview:** Display uploaded/captured photo before processing

### 3.2 Labubu Selection
- **Selection Grid:** Display 6-8 different Labubu doll options
- **Visual Previews:** Each option shows a thumbnail of the Labubu style
- **Selection State:** Clear visual indication of selected Labubu
- **Required:** User must select a Labubu before generation

### 3.3 Image Generation
- **Generate Button:** Prominent CTA button to start generation process
- **Loading States:**
  - Button shows loading spinner/text during processing
  - Uploaded image displays overlay with loading indicator
  - Estimated time display (optional)
- **Process Flow:**
  1. Merge user photo with selected Labubu using image merge tool
  2. Refine merged image using Qwen image edit model
  3. Return final generated image
- **Result Display:** Generated image replaces uploaded photo in the same container

### 3.4 Image Actions
- **Download:** Save generated image to device (desktop/mobile compatible)
- **Share:** Native share functionality for mobile, share URL for desktop
- **Clear & Restart:** Easy option to clear current session and start new generation

### 3.5 History Management
- **Local Storage:** Save generated images in browser storage
- **History View:** Accessible gallery of previously generated images
- **History Actions:**
  - View full-size image
  - Re-download any previous image
  - Delete individual images from history
  - Clear all history option
- **Persistence:** History persists across browser sessions

## 4. User Interface Requirements

### 4.1 Layout
- **Single Page Application:** All functionality on one page
- **Two-Panel Design:**
  - Left panel: Labubu selection grid and action buttons
  - Right panel: Photo upload/display area
- **Mobile:** Stack panels vertically for mobile view

### 4.2 Visual Design
- **Modern & Clean:** Minimalist design with focus on usability
- **Color Scheme:** Vibrant, youthful colors matching Labubu aesthetic
- **Typography:** Clear, readable fonts suitable for young audience
- **Animations:** Smooth transitions and micro-interactions

### 4.3 Responsive Design
- **Breakpoints:**
  - Mobile: < 640px
  - Tablet: 640px - 1024px
  - Desktop: > 1024px
- **Touch Optimized:** Large touch targets for mobile users
- **Adaptive UI:** Elements reflow appropriately for each screen size

## 5. Error Handling
- **Upload Errors:** Clear messaging for unsupported formats or file size issues
- **Generation Failures:** Friendly error messages with retry option
- **Network Issues:** Offline detection and appropriate user feedback
- **Storage Limits:** Warning when browser storage is full

## 6. Performance Requirements
- **Image Optimization:** Compress uploaded images before processing
- **Lazy Loading:** Load Labubu options as needed
- **Generation Time:** Target < 30 seconds for complete generation
- **Responsive UI:** Interface remains responsive during processing

## 7. Accessibility
- **WCAG 2.1 AA Compliance:** Ensure color contrast and keyboard navigation
- **Screen Reader Support:** Proper ARIA labels and semantic HTML
- **Alternative Text:** Descriptive alt text for all images
- **Focus Management:** Clear focus indicators and logical tab order

## 8. Browser Support
- **Modern Browsers:** Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Mobile Browsers:** iOS Safari, Chrome Mobile
- **Progressive Enhancement:** Core functionality works without JavaScript

## 9. Success Metrics
- **Generation Success Rate:** > 95% successful generations
- **Load Time:** Initial page load < 3 seconds
- **User Flow Completion:** > 80% users complete full generation flow
- **Mobile Usage:** Optimized for 60%+ mobile traffic

Prompt 2

You are an expert technical product manager specializing in feature development and creating comprehensive product requirements documents (PRDs). Your task is to generate a detailed and well-structured PRD based on the following instructions:

<prd_instructions>
# Labubufy - Functional Requirements Document

## 1. Overview
**Application Name:** Labubufy
**Purpose:** AI-powered photo generator that creates images of users holding Labubu dolls
**Target Audience:** Young people, particularly students, who want to share trendy Labubu photos on social media
**Platform:** Responsive web application (desktop and mobile)

## 2. Technical Stack
- **Framework:** Next.js with App Router
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **AI Integration:** Replicate API
  - Image Merge: `zsxkib/tool-merge-images:d933c8352ca7270ddf7c9c816e1c872f6114675ce43c8d70c924a3347bbeef05`
  - Image Edit: `qwen/qwen-image-edit`

## 3. Core Features

### 3.1 Photo Input
- **Upload Option:** Users can upload an existing photo from their device
- **Camera Option:** Users can take a selfie/photo directly using device camera
- **Supported Formats:** JPEG, PNG, WebP, HEIC
- **Mobile Responsive:** Full functionality on both desktop and mobile devices
- **Preview:** Display uploaded/captured photo before processing

### 3.2 Labubu Selection
- **Selection Grid:** Display 6-8 different Labubu doll options
- **Visual Previews:** Each option shows a thumbnail of the Labubu style
- **Selection State:** Clear visual indication of selected Labubu
- **Required:** User must select a Labubu before generation

### 3.3 Image Generation
- **Generate Button:** Prominent CTA button to start generation process
- **Loading States:**
  - Button shows loading spinner/text during processing
  - Uploaded image displays overlay with loading indicator
  - Estimated time display (optional)
- **Process Flow:**
  1. Merge user photo with selected Labubu using image merge tool
  2. Refine merged image using Qwen image edit model
  3. Return final generated image
- **Result Display:** Generated image replaces uploaded photo in the same container

### 3.4 Image Actions
- **Download:** Save generated image to device (desktop/mobile compatible)
- **Share:** Native share functionality for mobile, share URL for desktop
- **Clear & Restart:** Easy option to clear current session and start new generation

### 3.5 History Management
- **Local Storage:** Save generated images in browser storage
- **History View:** Accessible gallery of previously generated images
- **History Actions:**
  - View full-size image
  - Re-download any previous image
  - Delete individual images from history
  - Clear all history option
- **Persistence:** History persists across browser sessions

## 4. User Interface Requirements

### 4.1 Layout
- **Single Page Application:** All functionality on one page
- **Two-Panel Design:**
  - Left panel: Labubu selection grid and action buttons
  - Right panel: Photo upload/display area
- **Mobile:** Stack panels vertically for mobile view

### 4.2 Visual Design
- **Modern & Clean:** Minimalist design with focus on usability
- **Color Scheme:** Vibrant, youthful colors matching Labubu aesthetic
- **Typography:** Clear, readable fonts suitable for young audience
- **Animations:** Smooth transitions and micro-interactions

### 4.3 Responsive Design
- **Breakpoints:**
  - Mobile: < 640px
  - Tablet: 640px - 1024px
  - Desktop: > 1024px
- **Touch Optimized:** Large touch targets for mobile users
- **Adaptive UI:** Elements reflow appropriately for each screen size

## 5. Error Handling
- **Upload Errors:** Clear messaging for unsupported formats or file size issues
- **Generation Failures:** Friendly error messages with retry option
- **Network Issues:** Offline detection and appropriate user feedback
- **Storage Limits:** Warning when browser storage is full

## 6. Performance Requirements
- **Image Optimization:** Compress uploaded images before processing
- **Lazy Loading:** Load Labubu options as needed
- **Generation Time:** Target < 30 seconds for complete generation
- **Responsive UI:** Interface remains responsive during processing

## 7. Accessibility
- **WCAG 2.1 AA Compliance:** Ensure color contrast and keyboard navigation
- **Screen Reader Support:** Proper ARIA labels and semantic HTML
- **Alternative Text:** Descriptive alt text for all images
- **Focus Management:** Clear focus indicators and logical tab order

## 8. Browser Support
- **Modern Browsers:** Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Mobile Browsers:** iOS Safari, Chrome Mobile
- **Progressive Enhancement:** Core functionality works without JavaScript

## 9. Success Metrics
- **Generation Success Rate:** > 95% successful generations
- **Load Time:** Initial page load < 3 seconds
- **User Flow Completion:** > 80% users complete full generation flow
- **Mobile Usage:** Optimized for 60%+ mobile traffic

</prd_instructions>

Follow these steps to create the PRD:

1. Begin with a brief overview explaining the project and the purpose of the document.

2. Use sentence case for all headings except for the title of the document, which should be in title case.

3. Organize your PRD into the following sections:
   a. Introduction
   b. Product Overview
   c. Goals and Objectives
   d. Target Audience
   e. Features and Requirements
   f. User Stories and Acceptance Criteria
   g. Technical Requirements / Stack
   h. Design and User Interface

4. For each section, provide detailed and relevant information based on the PRD instructions. Ensure that you:
   - Use clear and concise language
   - Provide specific details and metrics where required
   - Maintain consistency throughout the document
   - Address all points mentioned in each section

5. When creating user stories and acceptance criteria:
   - List ALL necessary user stories including primary, alternative, and edge-case scenarios
   - Assign a unique requirement ID (e.g., ST-101) to each user story for direct traceability
   - Include at least one user story specifically for secure access or authentication if the application requires user identification
   - Include at least one user story specifically for Database modelling if the application requires a database
   - Ensure no potential user interaction is omitted
   - Make sure each user story is testable

6. Format your PRD professionally:
   - Use consistent styles
   - Include numbered sections and subsections
   - Use bullet points and tables where appropriate to improve readability
   - Ensure proper spacing and alignment throughout the document

7. Review your PRD to ensure all aspects of the project are covered comprehensively and that there are no contradictions or ambiguities.

Present your final PRD within <PRD> tags. Begin with the title of the document in title case, followed by each section with its corresponding content. Use appropriate subheadings within each section as needed.

Remember to tailor the content to the specific project described in the PRD instructions, providing detailed and relevant information for each section based on the given context.

