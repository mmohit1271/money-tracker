pipeline {
    agent any

    environment {
        DOCKER_IMAGE = "mmohit1271/money-tracker:latest"
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
                script {
                    echo 'Building Docker image...'
                    def appImage = docker.build("${DOCKER_IMAGE}")

                    echo 'Pushing Docker image to Docker Hub...'
                    docker.withRegistry('', 'docker-hub-credentials') {
                        appImage.push()
                    }
                }
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
