***Simple Object Detection in images using openCV and YOLO(darknet) Neural Network, YOLO V3 or V4***

*Copyright 2022-2025 Mikhail Garber*

**Install dependencies**

*Mac OS*
```
brew install opencv cmake
```

*Linux*
```
apt install libopencv-dev cmake
```

**Build**

```
cmake . && make
```

**Usage**

```
cat file-with-one-or-more-jpegs | object_detector names.file model.config model.weights confidence-float
```

Download yolo model weights, for example, yolov3.weights file.

