import React, { useState, useEffect } from 'react';
import ROSLIB from 'roslib';
import './App.css';

// --- Configuration ---
// IMPORTANT: Change this to your robot's IP address.
const ROSBRIDGE_URL = 'ws://localhost:9090';
// ---------------------

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [robotState, setRobotState] = useState('Connecting...');
  const [servingItem, setServingItem] = useState('None');
  const [queue, setQueue] = useState('Empty');
  const [segmentedImage, setSegmentedImage] = useState(null);
  const [processingLocked, setProcessingLocked] = useState(false);

  useEffect(() => {
    const ros = new ROSLIB.Ros({ url: ROSBRIDGE_URL });

    ros.on('connection', () => {
      setIsConnected(true);
      setRobotState('Idle');
    });
    ros.on('error', () => setIsConnected(false));
    ros.on('close', () => setIsConnected(false));

    // Subscriber for Robot State
    const stateListener = new ROSLIB.Topic({ ros, name: '/robot_state', messageType: 'std_msgs/msg/String' });
    stateListener.subscribe(message => setRobotState(message.data));

    // Subscriber for "Currently Serving"
    const servingListener = new ROSLIB.Topic({ ros, name: '/currently_serving', messageType: 'std_msgs/msg/String' });
    servingListener.subscribe(message => setServingItem(message.data));
    
    // Subscriber for Command Queue
    const queueListener = new ROSLIB.Topic({ ros, name: '/command_queue', messageType: 'std_msgs/msg/String' });
    queueListener.subscribe(message => setQueue(message.data));

    // NEW: Subscriber for Processing Lock Status
    const lockListener = new ROSLIB.Topic({ ros, name: '/processing_locked', messageType: 'std_msgs/msg/Bool' });
    lockListener.subscribe(message => setProcessingLocked(message.data));

    // Subscriber for Segmented Image 
    const imageListener = new ROSLIB.Topic({ 
      ros, 
      name: '/segmented_image', 
      messageType: 'sensor_msgs/msg/CompressedImage'  
    });
    
    imageListener.subscribe(message => {
      try {
        console.log('Received image message, data length:', message.data ? message.data.length : 'no data');
        
        // FIXED: Check if this is a clear image request (empty data)
        if (!message.data || message.data.length === 0) {
          console.log('Received clear image request - clearing display');
          setSegmentedImage(null); // Clear the image
          return;
        }
        
        // The data is already base64 encoded! Just use it directly
        const imageUrl = `data:image/jpeg;base64,${message.data}`;
        setSegmentedImage(imageUrl);
        
        console.log('Image set successfully, base64 length:', message.data.length);
      } catch (error) {
        console.error('Error processing image:', error);
      }
    });

    return () => {
      stateListener.unsubscribe();
      servingListener.unsubscribe();
      queueListener.unsubscribe();
      lockListener.unsubscribe();
      imageListener.unsubscribe();
      ros.close();
    };
  }, []);

  return (
    <div className="App">
      <header className="app-header">
        <h1>Robot Assisted Feeding</h1>
        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '● Connected' : '● Disconnected'}
        </div>
      </header>
      <main className="main-container">
        <div className="left-panel">
          <div className="info-card">
            <h2>Robot State</h2>
            <p className="state-display">{robotState}</p>
          </div>
          <div className="info-card">
            <h2>Currently Serving</h2>
            <div className={`item-display ${processingLocked ? 'locked' : ''}`}>
              {servingItem}
              {processingLocked && (
                <div className="lock-indicator">
                  <span className="lock-icon">🔒</span>
                  <span className="lock-text">Processing - Voice commands will affect next cycle</span>
                </div>
              )}
            </div>
          </div>
          <div className="info-card">
            <h2>Next in Line</h2>
            <p className="queue-display">{queue}</p>
          </div>
        </div>
        <div className="right-panel">
          <div className="image-card">
            <h2>Identified Item</h2>
            {segmentedImage ? (
              <div>
                <img 
                  src={segmentedImage} 
                  alt="Segmented food items"
                  onLoad={() => console.log('Image loaded successfully')}
                  onError={(e) => {
                    console.error('Image failed to load:', e);
                    console.log('Image src length:', segmentedImage ? segmentedImage.length : 'no src');
                    console.log('Image src preview:', segmentedImage ? segmentedImage.substring(0, 100) : 'no src');
                  }}
                  style={{ 
                    border: '1px solid #ddd',
                    backgroundColor: '#f9f9f9'
                  }}
                />
                <div style={{ fontSize: '0.8em', color: '#666', marginTop: '5px' }}>
                  Image data length: {segmentedImage ? segmentedImage.length : 0} characters
                </div>
              </div>
            ) : (
              <div className="placeholder-image">
                <p>Awaiting image from robot...</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;