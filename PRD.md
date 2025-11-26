# Doctor Portal - Product Requirements Document

A comprehensive medical portal enabling healthcare professionals to manage patients, appointments, and integrate with NPHIES systems while leveraging AI-powered insights for enhanced clinical decision-making.

**Experience Qualities**:
1. **Professional** - Clean, medical-grade interface that instills confidence and trust
2. **Efficient** - Streamlined workflows that minimize clicks and maximize productivity  
3. **Intelligent** - AI-powered insights that enhance clinical decision-making

**Complexity Level**: Complex Application (advanced functionality, accounts)
- Requires sophisticated state management for medical data, real-time features, secure messaging, and integration with external systems like NPHIES

## Essential Features

### Doctor Dashboard
- **Functionality**: Central hub displaying appointment overview, patient summaries, quick actions, and notifications
- **Purpose**: Provides at-a-glance view of daily workflow and urgent items
- **Trigger**: Landing page after login
- **Progression**: Login → Dashboard overview → Quick action selection → Navigate to specific modules
- **Success criteria**: Dashboard loads within 2s, shows current day appointments, displays pending notifications

### Patient Management
- **Functionality**: Complete patient list with search, filtering, and detailed patient profiles
- **Purpose**: Efficient patient lookup and comprehensive medical record access
- **Trigger**: Navigation from dashboard or direct access
- **Progression**: Patient list → Search/filter → Select patient → View detailed profile → Edit/update records
- **Success criteria**: Search returns results in <1s, patient details load completely, medical history displays chronologically

### Appointment System
- **Functionality**: Calendar-based appointment scheduling with conflict detection and patient notifications
- **Purpose**: Streamline appointment management and reduce scheduling conflicts
- **Trigger**: Dashboard calendar widget or dedicated appointments section
- **Progression**: View calendar → Select time slot → Add patient → Set appointment details → Confirm booking
- **Success criteria**: No double-bookings, appointment confirmations sent, calendar syncs in real-time

### NPHIES Integration
- **Functionality**: Secure portal integration for claims, approvals, and regulatory compliance
- **Purpose**: Seamless interaction with Saudi healthcare regulatory systems
- **Trigger**: Dedicated NPHIES section or patient-specific actions
- **Progression**: Select NPHIES action → Authenticate → Submit/retrieve data → Receive confirmation
- **Success criteria**: Secure data transmission, compliance with NPHIES protocols, audit trail maintained

### Telemedicine Suite
- **Functionality**: Video/audio consultations with recording and documentation capabilities
- **Purpose**: Enable remote patient care and expand service accessibility
- **Trigger**: Scheduled telemedicine appointment or emergency consultation
- **Progression**: Join call → Conduct consultation → Document visit → Generate reports
- **Success criteria**: HD video quality, secure transmission, consultation notes auto-saved

### AI Clinical Insights
- **Functionality**: BrainSait SDK integration for medical coding, predictive analytics, and clinical decision support
- **Purpose**: Enhance diagnostic accuracy and provide evidence-based recommendations
- **Trigger**: Patient record analysis or diagnostic support request
- **Progression**: Input patient data → AI analysis → Review recommendations → Accept/modify suggestions
- **Success criteria**: Relevant insights provided, medical codes suggested accurately, predictions align with clinical outcomes

### DrsLinc Conversational Copilot
- **Functionality**: Persistent, medically-aware chat window (DrsLinc) that surfaces context from the active patient chart, allows physicians to ask clinical, administrative, or coding questions, and can draft documentation or code snippets by orchestrating OpenAI ChatGPT, GitHub Copilot, and Claude models.
- **Purpose**: Provide real-time cognitive support, accelerate charting, and act as a safety net by cross-checking treatment plans against evidence-based guidelines.
- **Trigger**: Available from every major view (dashboard dock, patient profile, telemedicine, NPHIES flows) with keyboard shortcut (`Cmd/Ctrl + J`) and auto-suggested prompts when high-risk vitals or missing chart elements are detected.
- **Progression**: Invoke DrsLinc → Context auto-injected (patient demographics, vitals, meds, labs, encounter goal) → Physician query or accepts suggested task → DrsLinc selects optimal LLM (ChatGPT for reasoning, Claude for summarization, Copilot for code/automation) → Response with citations and quick actions (insert into note, create order, launch workflow) → Physician approves/edits → Audit log updated.
- **Success criteria**: Responses <1.5s for cached knowledge and <4s for federated LLM calls, ≥95% context accuracy, inline citations for every clinical recommendation, one-click insertion success, full audit trail stored for 7 years.

**DrsLinc Integration & Safeguards**
- **Context Controls**: Only minimum necessary PHI shared with LLMs, redaction rules configurable per facility, and visual indicator showing what context was transmitted.
- **Model Routing**: Policy engine chooses between ChatGPT, Claude, or Copilot based on task classification (diagnostic reasoning, summarization, automation). Hard failover to local deterministic templates when external APIs unavailable.
- **Clinical Guardrails**: Reinforcement prompts enforce "assist-not-decide" behavior, double-confirmation required for medication changes, and automatic alerting if suggestions conflict with guidelines or allergies.
- **User Experience**: Pin/unpin mini-panel, dark-mode aware, drag-to-resize transcript, downloadable conversation transcripts appended to encounter note.
- **Observability**: Token usage dashboards, satisfaction rating per response, and drift detection when clinicians frequently override recommendations.

## Edge Case Handling

- **Network Connectivity**: Offline mode for critical patient data access and sync when reconnected
- **Emergency Access**: Bypass authentication for emergency patient lookup with audit logging
- **Data Conflicts**: Merge resolution interface when multiple users edit same patient record
- **System Downtime**: Graceful degradation with essential functions available and clear status messaging
- **Privacy Violations**: Automatic session timeout and suspicious activity detection with immediate lockout
- **LLM Unavailability**: DrsLinc falls back to cached care pathways and local rules engine when OpenAI/GitHub/Claude endpoints fail, while queueing unanswered prompts for later replay with clinician approval.
- **Context Leakage**: Real-time PHI redaction monitor halts outbound requests when disallowed data classes are detected, alerting compliance teams.

## Design Direction

The design should evoke trust, professionalism, and clinical precision while maintaining modern usability standards. Clean, medical-grade interface with purposeful use of space and minimal cognitive load for healthcare professionals working in high-stress environments.

## Color Selection

Complementary (opposite colors) - Using medical blues with warm accent colors to balance clinical professionalism with human warmth and approachability.

- **Primary Color**: Medical Blue (oklch(0.45 0.15 240)) - Communicates trust, professionalism, and medical authority
- **Secondary Colors**: Light Clinical Gray (oklch(0.95 0.02 240)) for backgrounds and Sage Green (oklch(0.7 0.08 140)) for positive actions
- **Accent Color**: Warm Orange (oklch(0.7 0.15 50)) for urgent alerts and call-to-action elements
- **Foreground/Background Pairings**:
  - Background (Light Gray #F8F9FA): Dark Blue text (oklch(0.2 0.1 240)) - Ratio 12.5:1 ✓
  - Card (White #FFFFFF): Dark Blue text (oklch(0.2 0.1 240)) - Ratio 15.8:1 ✓
  - Primary (Medical Blue): White text (oklch(1 0 0)) - Ratio 5.2:1 ✓
  - Secondary (Light Gray): Dark Blue text (oklch(0.2 0.1 240)) - Ratio 11.8:1 ✓
  - Accent (Warm Orange): White text (oklch(1 0 0)) - Ratio 4.9:1 ✓

## Font Selection

Typography should convey medical precision and readability under various lighting conditions typical in healthcare environments.

- **Typographic Hierarchy**:
  - H1 (Portal Title): Inter Bold/32px/tight letter spacing
  - H2 (Section Headers): Inter SemiBold/24px/normal spacing
  - H3 (Subsections): Inter Medium/20px/normal spacing
  - Body Text: Inter Regular/16px/relaxed line height (1.6)
  - Small Text (Labels): Inter Medium/14px/normal spacing
  - Medical Data: JetBrains Mono Regular/14px for precise data display

## Animations

Subtle, purposeful animations that guide attention and provide feedback without interfering with clinical workflows or creating distraction during patient care.

- **Purposeful Meaning**: Smooth transitions communicate system responsiveness and guide user attention to important clinical information
- **Hierarchy of Movement**: Priority notifications get subtle pulse animations, data loading uses skeleton screens, navigation transitions are swift and directional

## Component Selection

- **Components**: 
  - Dashboard: Cards, Progress indicators, Badge components for status
  - Patient Lists: Table, Command palette for search, Avatar for patient photos
  - Forms: Form, Input, Select, Calendar for appointments
  - Dialogs: Alert Dialog for confirmations, Sheet for patient details
  - Navigation: Sidebar for main navigation, Breadcrumb for deep navigation
- **Conversational UI**: DrsLinc docked chat panel, inline suggestion chips, model source indicators, and response cards with action buttons (insert note, create task, open order set).
- **Customizations**: Medical chart components, NPHIES-specific form layouts, telemedicine video components
- **States**: Loading skeletons for patient data, error boundaries for critical failures, success confirmations for medical actions
- **Icon Selection**: Phosphor icons medical set - Stethoscope, Calendar, User, Phone, Video for intuitive recognition
- **Spacing**: Generous padding (24px sections, 16px cards) for touch-friendly mobile interface
- **Mobile**: Collapsible sidebar, swipe gestures for patient navigation, priority content first, touch-optimized button sizes (44px minimum)
