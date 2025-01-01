pipeline {
    agent any

    environment {
        DOCKER_IMAGE = "money-tracker-app"
        REGISTRY = "your-dockerhub-username"  // Replace with your Docker Hub username
    }

    stages {
        stage('Clone Repository') {
            steps {
                git 'https://github.com/your-username/money-tracker.git' // Replace with your repo URL
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    // Build the Docker image
                    sh 'docker build -t $REGISTRY/$DOCKER_IMAGE .'
                }
            }
        }

        stage('Push Docker Image') {
            steps {
                script {
                    // Log in to Docker Hub and push the image
                    sh "docker login -u $DOCKER_USERNAME -p $DOCKER_PASSWORD"
                    sh 'docker push $REGISTRY/$DOCKER_IMAGE'
                }
            }
        }

        stage('Deploy to Server') {
            steps {
                script {
                    // SSH into the server and pull the latest image, then run the container
                    sh '''
                        ssh -o StrictHostKeyChecking=no user@your-server-ip << EOF
                            docker pull $REGISTRY/$DOCKER_IMAGE
                            docker stop money-tracker || true
                            docker rm money-tracker || true
                            docker run -d -p 3000:3000 --name money-tracker $REGISTRY/$DOCKER_IMAGE
                        EOF
                    '''
                }
            }
        }
    }
}

