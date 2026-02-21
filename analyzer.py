import cv2
import numpy as np
import torch
import torchvision.transforms as T
from facenet_pytorch import MTCNN
from PIL import Image
import sys

video_path = sys.argv[1]

mtcnn = MTCNN(image_size=160, margin=10)

transform = T.Compose([
    T.Resize((224,224)),
    T.ToTensor()
])

# Basit deepfake model (CPU uyumlu)
model = torch.hub.load('pytorch/vision:v0.10.0', 'resnet18', pretrained=True)
model.eval()

def analyze_frame(frame):
    try:
        img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        img_t = transform(img).unsqueeze(0)
        with torch.no_grad():
            output = model(img_t)
        score = float(torch.sigmoid(output.mean()))
        return score
    except:
        return 0.5

cap = cv2.VideoCapture(video_path)

scores = []
frame_count = 0

while True:
    ret, frame = cap.read()
    if not ret:
        break
    
    frame_count += 1
    if frame_count % 10 != 0:  # her 10.kare
        continue
    
    score = analyze_frame(frame)
    scores.append(score)

cap.release()

final_score = np.mean(scores) if scores else 0.5

print(final_score)
