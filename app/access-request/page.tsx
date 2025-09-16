export default function AccessRequestPage() {
  return (
    <div style={{
      margin: 0,
      padding: 0,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        textAlign: 'center',
        color: 'white',
        maxWidth: '600px',
        padding: '2rem'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          marginBottom: '1rem',
          fontWeight: 300
        }}>
          Pact Wines
        </h1>
        <p style={{
          fontSize: '1.2rem',
          marginBottom: '2rem',
          opacity: 0.9
        }}>
          Join our exclusive wine community. Request access or enter your invitation code to unlock the platform.
        </p>
        
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '2rem',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <input 
            type="text" 
            placeholder="Enter your email or invitation code"
            style={{
              width: '100%',
              padding: '1rem',
              border: 'none',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.9)',
              fontSize: '1rem',
              marginBottom: '1rem',
              boxSizing: 'border-box'
            }}
          />
          <button style={{
            width: '100%',
            padding: '1rem',
            border: 'none',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            fontSize: '1rem',
            cursor: 'pointer',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            transition: 'all 0.3s ease'
          }}>
            Request Access
          </button>
        </div>
      </div>
    </div>
  );
}
