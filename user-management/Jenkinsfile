pipeline {
  agent {
    label "master"
  }
  environment {
    NON_PROD_NAMESPACE = "dino-dush-non-prod"
    PROD_NAMESPACE = "dino-dush-prod"
    APP_NAME = "user-management"
    JENKINS_TAG = "v${BUILD_NUMBER}".replace("/", "-")
    GIT_CREDENTIALS = credentials('dino-dush-non-prod-git-auth')
  }
  options {
    buildDiscarder(logRotator(numToKeepStr:'10'))
    timeout(time: 20, unit: 'MINUTES')
  }
  stages {
    stage("Test and Build code") {
      agent {
        node {
          label "maven"
        }
      }
      steps {
        echo 'Running tests'
        sh '''
          cd user-management/
          ./mvnw test
        '''
        echo 'Running build'
        sh '''
          oc patch bc ${APP_NAME} -p "{\\"spec\\":{\\"output\\":{\\"to\\":{\\"kind\\":\\"ImageStreamTag\\",\\"name\\":\\"${APP_NAME}:${JENKINS_TAG}\\"}}}}" -n ${NON_PROD_NAMESPACE}
          oc start-build ${APP_NAME} --follow -n ${NON_PROD_NAMESPACE}
        '''
      }
      post {
        always {
          // archive "user-management/**"
          junit 'user-management/target/surefire-reports/TEST-*.xml'
        }
        failure {
          echo "FAILURE"
        }
      }
    }
    stage("Deploy Non Prod") {
      agent {
        node {
          label "master"
        }
      }
      steps {
        echo 'Set image for deployment'
        sh '''
          oc set image dc/${APP_NAME} ${APP_NAME}=${NON_PROD_NAMESPACE}/${APP_NAME}:${JENKINS_TAG} --source=imagestreamtag -n ${NON_PROD_NAMESPACE}
        '''
        script {
          try {
            echo 'Resume deployment'
            sh 'oc rollout resume dc/${APP_NAME} -n ${NON_PROD_NAMESPACE}'
          } catch (error) {}
        }
        script {
          try {
            echo 'Rollout deployment'
            sh 'oc rollout latest dc/${APP_NAME} -n ${NON_PROD_NAMESPACE}'
          } catch (error) {}
        }
        echo 'Verify OCP deployment'
        openshiftVerifyDeployment depCfg: env.APP_NAME,
          namespace: env.NON_PROD_NAMESPACE,
          replicaCount: '1',
          verbose: 'false',
          verifyReplicaCount: 'true',
          waitTime: '',
          waitUnit: 'sec'
      }
    }
    stage("Prepare B/G Deploy") {
      agent {
        node {
          label "master"
        }
      }
      when {
        expression { GIT_BRANCH ==~ /(.*master)/ }
      }
      steps {
        script {
          echo 'Get active mode'
          env.ACTIVE_MODE = sh '''
            oc get pod --selector=app=${APP_NAME} -o jsonpath='{ .items[0].metadata.labels.mode }' -n ${PROD_NAMESPACE}
          '''
          if (env.ACTIVE_MODE == '') {
            env.ACTIVE_MODE = 'blue'
          }
          echo "Active mode: ${ACTIVE_MODE}"
          if (env.ACTIVE_MODE == 'blue') {
            env.NOT_ACTIVE_MODE = 'green'
          } else {
            env.NOT_ACTIVE_MODE = 'blue'
          }
          echo "Not Active mode: ${NOT_ACTIVE_MODE}"
        }
      }
    }
    stage("B/G Deploy Prod") {
      agent {
        node {
          label "master"
        }
      }
      when {
        expression { GIT_BRANCH ==~ /(.*master)/ }
      }
      steps {
        echo 'Tag image for namespace'
        sh '''
          printenv
          oc tag ${NON_PROD_NAMESPACE}/${APP_NAME}:${JENKINS_TAG} ${PROD_NAMESPACE}/${APP_NAME}:${JENKINS_TAG} -n ${PROD_NAMESPACE}
        '''
        echo '### set env vars and image for deployment ###'
        sh '''
          oc set image dc/${APP_NAME}-${NOT_ACTIVE_MODE} \
            ${APP_NAME}=${PROD_NAMESPACE}/${APP_NAME}:${JENKINS_TAG} --source=imagestreamtag -n ${PROD_NAMESPACE}
        '''
        script {
          try {
            echo 'Resume deployment'
            sh 'oc rollout resume dc/${APP_NAME}-${NOT_ACTIVE_MODE} -n ${PROD_NAMESPACE}'
          } catch (error) {}
        }
        script {
          try {
            echo 'Rollout deployment'
            sh 'oc rollout latest dc/${APP_NAME}-${NOT_ACTIVE_MODE} -n ${PROD_NAMESPACE}'
          } catch (error) {}
        }
        echo '### Verify OCP Deployment ###'
        openshiftVerifyDeployment depCfg: "${APP_NAME}-${NOT_ACTIVE_MODE}",
          namespace: env.PROD_NAMESPACE,
          replicaCount: '1',
          verbose: 'false',
          verifyReplicaCount: 'true',
          waitTime: '',
          waitUnit: 'sec'

        echo '### Change balance configuration ###'
        sh '''
          oc set route-backends ${APP_NAME} ${APP_NAME}-${ACTIVE_MODE}=0 ${APP_NAME}-${NOT_ACTIVE_MODE}=0 -n ${PROD_NAMESPACE}
        '''
      }
    }
    stage("Approve") {
      agent {
        node {
          label "master"
        }
      }
      when {
        expression { GIT_BRANCH ==~ /(.*master)/ }
      }
      steps {
        script {
          def userInput = false
          try {
            timeout(time: 1, unit: "MINUTES") {
              userInput = input(
                id: 'Proceed1', message: 'Was this successful?', parameters: [
                [$class: 'BooleanParameterDefinition', defaultValue: true, description: '', name: 'Please confirm you agree with this']
                ])
              echo 'userInput: ' + userInput
              if (userInput == true) {
                // do action
                echo "Action was accepted."
                env.WAS_APPROVED = "true"
              } else {
                // not do action
                echo "Action was aborted."
                env.WAS_APPROVED = "false"
              }
            }
          } catch (error) {
            echo "Action was aborted by timeout."
            env.WAS_APPROVED = "false"
          }
        }
      }
    }
    stage("Idle Older Deploy") {
      agent {
        node {
          label "master"
        }
      }
      when {
        expression {
          GIT_BRANCH ==~ /(.*master)/ && WAS_APPROVED == 'true'
        }
      }
      steps {
        echo 'Idle older deployment'
        sh '''
          oc idle ${APP_NAME}-${ACTIVE_MODE} -n ${PROD_NAMESPACE}
        '''
      }
    }
    stage("Canceling deploy") {
      agent {
        node {
          label "master"
        }
      }
      when {
        expression {
          GIT_BRANCH ==~ /(.*master)/ && WAS_APPROVED == 'false'
        }
      }
      steps {
        echo 'Return balance configuration'
        sh '''
          oc set route-backends ${APP_NAME} ${APP_NAME}-${ACTIVE_MODE}=100 -n ${PROD_NAMESPACE}
        '''
        echo 'Idle latest deployment'
        sh '''
          oc idle ${APP_NAME}-${NOT_ACTIVE_MODE} -n ${PROD_NAMESPACE}
        '''
      }
    }
  }
}
