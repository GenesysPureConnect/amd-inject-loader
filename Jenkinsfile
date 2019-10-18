@Library(['pureconnect-builds', 'devops-buildtools']) _

Map config = [ emails: 'PureConnectWebAppsArchitects@genesys.com' ];
pipeline {
    agent {
        label 'linux && node10'
    }

    stages {
        stage('Bootstrap') {
            steps {
                sh 'npm ci'
            }
        }
        stage('Test') {
            steps {
                sh 'npm run test'
            }
        }
        stage('Publish') {
            steps {
                echo 'Publish to artifactory'
                publishNpmPackage()
            }
        }
    }
    post {
        success { 
            script {
                postBuild.success(config)
            }
        }
        failure {
            script {
                postBuild.failure(config)
            }
        }
    }
}