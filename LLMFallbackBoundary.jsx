import React from 'react';

class LLMFallbackBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("LLM Component Error caught by Boundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '16px',
          border: '1px solid #ff4d4f',
          borderRadius: '8px',
          backgroundColor: '#fff1f0',
          color: '#a8071a'
        }}>
          <h3>Default UI Mode Active</h3>
          <p>The system reverted to standard layout mode due to a rendering issue with the generated component.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default LLMFallbackBoundary;