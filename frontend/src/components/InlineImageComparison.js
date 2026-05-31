import React, { useEffect, useState, useRef } from 'react';

const InlineImageComparison = ({ messages }) => {
  const [beforeImage, setBeforeImage] = useState(null);
  const [afterImage, setAfterImage] = useState(null);
  const [status, setStatus] = useState(null);
  const [isComparing, setIsComparing] = useState(false);

  const canvasBeforeRef = useRef(null);
  const canvasAfterRef = useRef(null);
  
  const backendUrl = 'https://campus-cart-on6p.onrender.com';

  useEffect(() => {
    const beforeMsgs = messages.filter(m => m.image_type === 'before' && m.image_url);
    const afterMsgs = messages.filter(m => m.image_type === 'after' && m.image_url);

    if (beforeMsgs.length > 0) {
      const bImgUrl = beforeMsgs[beforeMsgs.length - 1].image_url;
      setBeforeImage(bImgUrl.startsWith('http') ? bImgUrl : `${backendUrl}${bImgUrl}`);
    }
    
    if (afterMsgs.length > 0) {
      const aImgUrl = afterMsgs[afterMsgs.length - 1].image_url;
      setAfterImage(aImgUrl.startsWith('http') ? aImgUrl : `${backendUrl}${aImgUrl}`);
    }
  }, [messages]);

  useEffect(() => {
    if (!beforeImage || !afterImage) return;

    const imgBefore = new Image();
    const imgAfter = new Image();

    imgBefore.crossOrigin = "anonymous";
    imgAfter.crossOrigin = "anonymous";

    let loadedCount = 0;

    const onLoad = () => {
      loadedCount++;
    };

    imgBefore.onload = onLoad;
    imgAfter.onload = onLoad;
    
    const onError = () => {
       setStatus('Error loading images for comparison.');
    }
    imgBefore.onerror = onError;
    imgAfter.onerror = onError;

    imgBefore.src = beforeImage;
    imgAfter.src = afterImage;
  }, [beforeImage, afterImage]);

  const handleCompareClick = () => {
    if (!beforeImage || !afterImage) return;
    setIsComparing(true);
    setStatus('Analyzing...');

    const imgBefore = new Image();
    const imgAfter = new Image();
    imgBefore.crossOrigin = "anonymous";
    imgAfter.crossOrigin = "anonymous";

    let loadedCount = 0;
    const onLoad = () => {
      loadedCount++;
      if (loadedCount === 2) {
        compareImages(imgBefore, imgAfter);
      }
    };

    const onError = () => {
       setStatus('Error loading images for comparison.');
       setIsComparing(false);
    };

    imgBefore.onload = onLoad;
    imgAfter.onload = onLoad;
    imgBefore.onerror = onError;
    imgAfter.onerror = onError;

    imgBefore.src = beforeImage;
    imgAfter.src = afterImage;
  };

  const compareImages = (img1, img2) => {
    try {
      const width = 300;
      const height = 300;

      const canvas1 = canvasBeforeRef.current;
      const canvas2 = canvasAfterRef.current;

      if (!canvas1 || !canvas2) return;

      canvas1.width = width;
      canvas1.height = height;
      canvas2.width = width;
      canvas2.height = height;

      const ctx1 = canvas1.getContext('2d');
      const ctx2 = canvas2.getContext('2d');

      ctx1.drawImage(img1, 0, 0, width, height);
      ctx2.drawImage(img2, 0, 0, width, height);

      const data1 = ctx1.getImageData(0, 0, width, height).data;
      const data2 = ctx2.getImageData(0, 0, width, height).data;

      let diffPixels = 0;
      const totalPixels = width * height;

      for (let i = 0; i < data1.length; i += 4) {
        const r1 = data1[i];
        const g1 = data1[i + 1];
        const b1 = data1[i + 2];

        const r2 = data2[i];
        const g2 = data2[i + 1];
        const b2 = data2[i + 2];

        const diff = Math.sqrt(
          Math.pow(r1 - r2, 2) +
          Math.pow(g1 - g2, 2) +
          Math.pow(b1 - b2, 2)
        );

        if (diff > 50) {
          diffPixels++;
        }
      }

      const diffPercent = (diffPixels / totalPixels) * 100;

      if (diffPercent > 15) {
        setStatus('Possible damage detected');
      } else if (diffPercent > 5) {
        setStatus('Item condition changed');
      } else {
        setStatus('No major damage detected');
      }
    } catch (e) {
      console.error(e);
      setStatus('Could not analyze images due to a technical error.');
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div style={styles.container}>
      <h4 style={styles.title}>Condition Verification</h4>
      
      <div style={styles.imagesContainer}>
        <div style={styles.imageCol}>
          <div style={styles.label}>Before Image</div>
          {beforeImage && <img src={beforeImage} alt="Before" style={styles.image} />}
        </div>
        
        <div style={styles.divider}></div>
        
        <div style={styles.imageCol}>
          <div style={styles.label}>After Image</div>
          {afterImage && <img src={afterImage} alt="After" style={styles.image} />}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <button 
          onClick={handleCompareClick} 
          disabled={isComparing || !beforeImage || !afterImage}
          style={styles.compareBtn}
        >
          {isComparing ? 'Comparing...' : 'Compare Product Condition'}
        </button>
      </div>

      {status && (
        <div style={{
          ...styles.resultBox,
          backgroundColor: status.includes('No major') ? '#e8f5e9' : (status.includes('Possible') ? '#ffebee' : '#fff3e0'),
          borderColor: status.includes('No major') ? '#c8e6c9' : (status.includes('Possible') ? '#ffcdd2' : '#ffe0b2'),
          color: status.includes('No major') ? '#2e7d32' : (status.includes('Possible') ? '#c62828' : '#ef6c00')
        }}>
          <strong>Comparison Result:</strong> {status}
        </div>
      )}

      {/* Hidden canvases */}
      <canvas ref={canvasBeforeRef} style={{ display: 'none' }}></canvas>
      <canvas ref={canvasAfterRef} style={{ display: 'none' }}></canvas>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#fff3e0',
    borderRadius: '12px',
    padding: '1rem',
    margin: '1rem 0',
    border: '1px solid #ffe0b2',
    alignSelf: 'center',
    width: '100%',
    maxWidth: '500px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  title: {
    marginTop: 0,
    marginBottom: '1rem',
    textAlign: 'center',
    color: '#e65100'
  },
  imagesContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1rem'
  },
  imageCol: {
    flex: 1,
    textAlign: 'center'
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: 'bold',
    color: '#666',
    marginBottom: '0.5rem'
  },
  image: {
    width: '100%',
    height: '100px',
    objectFit: 'cover',
    borderRadius: '8px',
    border: '1px solid #ccc'
  },
  divider: {
    width: '1px',
    height: '100px',
    backgroundColor: '#ccc'
  },
  resultBox: {
    backgroundColor: '#fff',
    padding: '1rem',
    borderRadius: '8px',
    textAlign: 'center',
    border: '1px solid #e0e0e0',
    color: '#333',
    fontWeight: 'bold',
    fontSize: '1.1rem'
  },
  compareBtn: {
    backgroundColor: '#F88000',
    color: '#fff',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '25px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    transition: 'background-color 0.2s',
  }
};

export default InlineImageComparison;
