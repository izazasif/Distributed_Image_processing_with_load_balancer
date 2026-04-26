pipeline {
    agent any

    environment {
        AWS_REGION = 'us-east-2'
        ACCOUNT_ID = '449902673787'
        ECR_REPO = 'myapp-backend'
        IMAGE_TAG = "${BUILD_NUMBER}"
        ECR_URI = "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}"
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/izazasif/Distributed_Image_processing_with_load_balancer.git'
            }
        }

        stage('Build Backend Image') {
            steps {
                sh 'docker build -t myapp-backend ./backend'
            }
        }

        stage('Login to ECR') {
            steps {
                sh '''
                aws ecr get-login-password --region $AWS_REGION \
                | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
                '''
            }
        }

        stage('Push Image to ECR') {
            steps {
                sh '''
                docker tag myapp-backend:latest $ECR_URI:$IMAGE_TAG
                docker tag myapp-backend:latest $ECR_URI:latest

                docker push $ECR_URI:$IMAGE_TAG
                docker push $ECR_URI:latest
                '''
            }
        }

        stage('Deploy to EKS') {
            steps {
                sh '''
                kubectl set image deployment/backend backend=$ECR_URI:$IMAGE_TAG
                kubectl rollout status deployment/backend
                '''
            }
        }
    }
}