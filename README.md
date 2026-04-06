# Emotion-Adaptive UI System (EAUIS)

An early-stage desktop widget system that adapts its interface based on user interaction signals such as typing activity and key patterns.

## Overview

Emotion-Adaptive UI System (EAUIS) is a capstone-oriented project focused on adaptive interfaces.
The system is designed to:
- infer a simple mood state from measurable behavior
- update the UI theme and character expression in real time
- store mood and survey data for analysis and reporting

## Planned Product Experience

- A small floating widget that can be dragged anywhere on screen
- A cute emotion indicator that changes state (Happy, Neutral, Stressed)
- A details interface for settings, logs, and evaluation inputs
- Local persistence for mood logs and usability survey results

## Core Idea

The project uses a 3-layer concept:
- Sensors: capture interaction signals (keystrokes, timing, patterns)
- Brain: compute mood state using rules such as APM and pattern matching
- Face: reflect mood through color, typography, layout, and animation

## Architecture

The codebase follows a Controller-Service-Repository style structure:
- Controller: input handling and request validation
- Service: business logic and mood computation
- Repository: data access and SQL operations

Current structure includes:
- backend modules for controller/service/repository flow
- preload bridge for safe frontend-backend communication
- SQLite setup for local persistence

## Tech Stack

- Electron (desktop shell)
- HTML, CSS, JavaScript (interface)
- Node.js (runtime)
- SQLite (local database)

## Project Status

Early development / foundation stage.

Implemented:
- initial backend scaffolding
- survey persistence flow (controller -> service -> repository -> SQLite)
- IPC bridge and backend route foundation

In progress / next:
- complete Electron entry and window lifecycle
- implement mood engine and input tracker
- build floating widget UI and details interface
- complete reporting-oriented data views

## Repository Goals

This repository is intended to support:
- capstone implementation
- reproducible setup for collaborators
- clear engineering structure for review and defense

## Quick Start

1. Install Node.js LTS.
2. Open the repository in VS Code.
3. Run: npm install
4. Run: npm start

For collaborator-specific setup, see SETUP.md.

## Roadmap (Short)

- v0.1: app shell + basic widget UI
- v0.2: mood logic + live UI adaptation
- v0.3: logging, survey, and settings interface
- v0.4: analysis outputs for evaluation/reporting
