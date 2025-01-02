pipeline {
    agent any

    environment {
        DOCKER_IMAGE = "mmohit1271/money-tracker-app:latest"
    }

    stages {
        stage('Checkout') {
            steps {
                echo 'Cloning repository...'
                checkout scm
            }
        }

        stage('Build and Push Docker Image') {
            steps {
                echo 'Building Docker image...'
                sh """
                    docker build -t ${DOCKER_IMAGE} .
                    docker login -u $DOCKER_USERNAME -p $DOCKER_PASSWORD
                    docker push ${DOCKER_IMAGE}
                """
            }
        }

        stage('Deploy Application') {
            steps {
                echo 'Deploying the application...'
                sh """
                    docker rm -f money-tracker || true
                    docker run -d --name money-tracker -p 3000:3000 ${DOCKER_IMAGE}
                """
            }
        }
    }

    post {
        always {
            echo 'Pipeline execution completed.'
        }
        success {
            echo 'Deployment successful.'
        }
        failure {
            echo 'Pipeline failed. Check logs for details.'
        }
    }
}
