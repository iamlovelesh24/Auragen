import React, { Component } from 'react';

export default class LLMFallbackBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('LLMFallbackBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '16px', border: '1px solid orange', backgroundColor: '#fff9db', borderRadius: '6px' }}>
          <h3>⚠️ Workspace Fallback Mode Active</h3>
          <p>The UI encountered a minor rendering hiccup. Telemetry connection remains active in the background.</p>
        </div>
      );
    }

    return this.props.children;
  }
}