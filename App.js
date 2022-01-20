import {StatusBar} from 'expo-status-bar';
import React, {useEffect, useRef, useState} from 'react';
import {Image, Platform, StyleSheet, Text, View} from 'react-native';
import * as tf from '@tensorflow/tfjs';
import {
  bundleResourceIO,
  decodeJpeg,
  fetch,
} from '@tensorflow/tfjs-react-native';
import RNSketchCanvas, {
  SketchCanvas,
} from '@kichiyaki/react-native-sketch-canvas';
import ImageResizer from 'react-native-image-resizer';

const labels = [
  '',
  'ا',
  'ب',
  'ت',
  'ث',
  'ج',
  'ح',
  'خ',
  'د',
  'ذ',
  'ر',
  'ز',
  'س',
  'ش',
  'ص',
  'ض',
  'ط',
  'ظ',
  'ع',
  'غ',
  'ف',
  'ق',
  'ك',
  'ل',
  'م',
  'ن',
  'هـ',
  'و',
  'ي',
  'ء',
];

export default function App() {
  const [isTFReady, setTFReady] = useState(false);
  const [model, setModel] = useState(false);
  const [urlImage, setUrlImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [output, setOutput] = useState(null);
  const canvas = useRef(null);
  const interval = useRef(null);
  const localModel = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        await tf.ready();
        setTFReady(true);
        console.log('tf is ready');
        const modelJSON = require('./assets/model/model.json');
        const modelWeights = require('./assets/model/group1-shard.bin');
        const modelLocal = await tf.loadLayersModel(
          bundleResourceIO(modelJSON, modelWeights),
        );
        modelLocal.summary();
        console.log('modelLocal is ready: ');
        setModel(modelLocal);
        localModel.current = modelLocal;
      } catch (error) {
        console.log('error in TF: ', error);
      }
    })();
  }, []);

  const endDraw = async () => {
    try {
      await canvas.current.save(
        'png',
        true,
        '',
        String(Math.ceil(Math.random() * 100000000)),
        true,
        true,
        true,
      );
    } catch (error) {
      console.log('error in endDraw: ', error);
    }
  };

  function startTimer(dur) {
    interval.current = setInterval(async () => {
      if (dur < 0) {
        try {
          canvas.current.clear();
          clearInterval(interval.current);
          endDraw();
        } catch (error) {
          console.log('error in get image: ', error);
        }
      } else {
        --dur;
      }
    }, 1000);
  }

  useEffect(() => {
    if (urlImage) {
      (async () => {
        try {
          const image32 = await ImageResizer.createResizedImage(
            urlImage,
            32,
            32,
            'JPEG',
            100,
            0,
            '',
            true,
            {mode: 'contain'},
          );
          const response = await fetch(image32.path, {}, {isBinary: true});
          const imageDataArrayBuffer = await response.arrayBuffer();
          const imageData = new Uint8Array(imageDataArrayBuffer);
          const imageTensor = decodeJpeg(imageData, 3);
          const predictions = await localModel.current
            .predict(tf.expandDims(imageTensor))
            .dataSync();
          for (let i = 0; i < predictions.length; i++) {
            const label = labels[i];
            const probability = predictions[i];
            if (probability == 1) {
              setOutput(label);
            }
            console.log(`${label}: ${probability}`);
          }
          console.log('labels: ', labels.length);
          console.log('predictions: ', predictions.length);
        } catch (error) {
          console.log('error in predict: ', error);
        }
      })();
    }
  }, [urlImage]);

  return (
    <View style={styles.container}>
      <Text>
        {isTFReady ? 'tensorflow is ready' : 'tensorflow not ready :( ..'}
      </Text>
      <Text>
        {isTFReady ? 'modelLocal is ready' : 'modelLocal not ready :( ..'}
      </Text>

      <StatusBar style="auto" />
      <SketchCanvas
        localSourceImage={{
          filename: 'black',
          directory: '',
          mode: 'AspectFill',
        }}
        ref={canvas}
        style={{
          // flex: 1,
          paddingHorizontal: 15,
          height: 200,
          backgroundColor: '#00f5',
          width: '100%',
        }}
        strokeColor={'#fff'}
        strokeWidth={7}
        onSketchSaved={(success, path) => {
          if (success) {
            setUrlImage(path);
          }
        }}
        onStrokeEnd={() => {
          startTimer(0.2);
        }}
        onStrokeStart={() => clearInterval(interval.current)}
      />
      {urlImage && (
        <Image
          source={{uri: urlImage}}
          style={{
            height: 100,
            width: 100,
            marginTop: 30,
            resizeMode: 'contain',
            marginBottom: 15,
          }}
        />
      )}
      <Text>{`الحرف المتوقع هو ${output}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
