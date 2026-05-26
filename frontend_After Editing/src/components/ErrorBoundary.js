import { Component } from "react";
import { Container, Button } from "react-bootstrap";

// Catches rendering errors in child components and shows a fallback UI instead of a white screen
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  // Updates state so the next render shows the fallback UI
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  // Logs the error details for debugging when something breaks
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container className="text-center py-5">
          <div style={{ fontSize: "60px", marginBottom: "20px" }}>⚠️</div>
          <h2>Something went wrong</h2>
          <p className="text-muted mb-4">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <div className="d-flex gap-3 justify-content-center">
            <Button
              variant="primary"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = "/";
              }}
            >
              Go Home
            </Button>
          </div>
        </Container>
      );
    }

    return this.props.children;
  }
}
