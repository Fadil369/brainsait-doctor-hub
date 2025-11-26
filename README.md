# 🏥 BrainSAIT Doctor Hub

A comprehensive healthcare portal for doctors and medical professionals in Saudi Arabia, built with modern React/TypeScript stack featuring AI-powered diagnostics, NPHIES compliance, and telemedicine capabilities.

## ✨ Features

### 🔬 AI-Powered Healthcare Platform
- **DrsLinc AI Copilot**: Multi-modal AI assistant for medical diagnosis and clinical decision support
- **Arabic/English Bilingual Support**: Full localization for Saudi healthcare standards
- **PHI Data Protection**: HIPAA-compliant data handling and audit trails

### 🏥 Comprehensive Medical Workflow
- **Patient Management**: Complete EMR with security controls and audit logging
- **NPHIES Integration**: Real-time claims submission and eligibility verification
- **Telemedicine Suite**: Secure video consultations with end-to-end encryption
- **Appointment Management**: Intelligent scheduling with conflict resolution

### 📊 Healthcare Analytics & Reporting
- **Real-time Dashboards**: Clinical outcome monitoring and performance metrics
- **Compliance Reporting**: Automated regulatory compliance documentation
- **Multi-facility Support**: Single platform for clinics, hospitals, and healthcare networks

### 🛡️ Security & Compliance
- **Saudi MOH Compliant**: Meets all Ministry of Health regulatory requirements
- **Bank-grade Security**: Advanced encryption, role-based access, and audit trails
- **Offline Capabilities**: PWA support for remote and underserved areas

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn
- GitHub OAuth access (for authentication)

### Installation
```bash
git clone https://github.com/Fadil369/brainsait-doctor-hub.git
cd brainsait-doctor-hub
npm install
cp .env.example .env.local
```

### Configure Environment Variables
```bash
# Fill in your NPHIES credentials in .env.local:
VITE_NPHIES_PROVIDER_ID="your_nphies_provider_id"
VITE_NPHIES_API_KEY="your_nphies_api_key"
VITE_NPHIES_ENV="sandbox"  # Change to "production" when ready
```

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

## 🩺 Doctor Directory Data Pipeline

The messaging and consultation experiences now read live doctor metadata from `public/data/doctors-directory.json`, which is generated from the Apple Numbers workbook delivered by the operations team.

1. Drop the latest `doctors_database_*.numbers` export into the repository root (or update `NUMBERS_PATH` inside `scripts/build_doctor_directory.py`).
2. Create a virtual environment and install the parser:
   ```bash
   python3 -m venv .venv-data
   source .venv-data/bin/activate
   pip install numbers-parser pandas
   ```
3. Build the JSON dataset:
   ```bash
   python scripts/build_doctor_directory.py
   ```
   The script filters out non-person rows, infers specialties, and writes the sanitized directory to `public/data/doctors-directory.json`.
4. Commit the regenerated JSON so the React hooks can serve it statically in all environments.

The UI automatically hot-reloads the dataset via the `useDoctorDirectory` hook, so no additional wiring is required once the JSON is present.

## 🏗️ Architecture

Built with modern healthcare-grade technologies:

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Database**: IndexedDB with advanced schema validation
- **AI Integration**: Multi-model routing with PHI minimization
- **Security**: Comprehensive encryption and audit trails
- **Compliance**: NPHIES API integration and MOH regulations

## 📚 Documentation

- [API Documentation](./docs/api.md)
- [NPHIES Integration Guide](./docs/nphies.md)
- [Security & Compliance](./docs/security.md)
- [Deployment Guide](./docs/deployment.md)

## 🤝 Contributing

This platform serves critical healthcare infrastructure. Please follow our strict contribution guidelines:

1. **Security Review**: All changes undergo security audit
2. **Compliance Check**: Healthcare regulations compliance required
3. **Testing**: Comprehensive test coverage mandatory
4. **Documentation**: All features must be fully documented

## 📞 Support & Licensing

Licensed under MIT License - see [LICENSE](LICENSE) for details.

For support: contact@brainsait.com | 🚀 Powered by BrainSAIT Ecosystem
