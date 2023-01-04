import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as openapix from '@alma-cdk/openapix'
import * as path from 'path';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { open } from 'fs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway'

export class OpenapixCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // const userPool = new cognito.UserPool(this, 'userpool', {
    //   userPoolName: 'my-user-pool',
    //   signInAliases: {
    //     email: true,
    //   },
    //   autoVerify: {
    //     email: true,
    //   },
    //   standardAttributes: {
    //     givenName: {
    //       required: true,
    //       mutable: true,
    //     },
    //     familyName: {
    //       required: true,
    //       mutable: true,
    //     },
    //   },
    //   customAttributes: {
    //     country: new cognito.StringAttribute({mutable: true}),
    //     city: new cognito.StringAttribute({mutable: true}),
    //     isAdmin: new cognito.StringAttribute({mutable: true}),
    //   },
    //   passwordPolicy: {
    //     minLength: 6,
    //     requireLowercase: true,
    //     requireDigits: true,
    //     requireUppercase: false,
    //     requireSymbols: false,
    //   },
    //   accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
    //   removalPolicy: cdk.RemovalPolicy.RETAIN,
    // });


    // // 👇 User Pool Client attributes
    // const standardCognitoAttributes = {
    //   givenName: true,
    //   familyName: true,
    //   email: true,
    //   emailVerified: true,
    //   address: true,
    //   birthdate: true,
    //   gender: true,
    //   locale: true,
    //   middleName: true,
    //   fullname: true,
    //   nickname: true,
    //   phoneNumber: true,
    //   phoneNumberVerified: true,
    //   profilePicture: true,
    //   preferredUsername: true,
    //   profilePage: true,
    //   timezone: true,
    //   lastUpdateTime: true,
    //   website: true,
    // };

    // const clientReadAttributes = new cognito.ClientAttributes()
    //   .withStandardAttributes(standardCognitoAttributes)
    //   .withCustomAttributes(...['country', 'city', 'isAdmin']);

    // const clientWriteAttributes = new cognito.ClientAttributes()
    //   .withStandardAttributes({
    //     ...standardCognitoAttributes,
    //     emailVerified: false,
    //     phoneNumberVerified: false,
    //   })
    //   .withCustomAttributes(...['country', 'city']);

    // // 👇 User Pool Client
    // const userPoolClient = new cognito.UserPoolClient(this, 'userpool-client', {
    //   userPool,
    //   authFlows: {
    //     adminUserPassword: true,
    //     custom: true,
    //     userSrp: true,
    //   },
    //   supportedIdentityProviders: [
    //     cognito.UserPoolClientIdentityProvider.COGNITO,
    //   ],
    //   readAttributes: clientReadAttributes,
    //   writeAttributes: clientWriteAttributes,
    // });

    // // 👇 Outputs
    // new cdk.CfnOutput(this, 'userPoolId', {
    //   value: userPool.userPoolId,
    // });
    // new cdk.CfnOutput(this, 'userPoolClientId', {
    //   value: userPoolClient.userPoolClientId,
    // });

    // let authorizer = new openapix.CognitoUserPoolsAuthorizer(this, 'MyCognitoAuthorizer', {
    //     cognitoUserPools: [userPool],
    //     resultsCacheTtl: cdk.Duration.minutes(5),
    //   });

    const target = 'x86_64-unknown-linux-musl';
    const helloFn = new lambda.Function(this, 'HelloHandler', {
      code: lambda.Code.fromAsset('lambda/hello', {
        bundling: {
          command: [
            'bash', '-c',
            `rustup target add ${target} && cargo build --release --target ${target} && cp target/${target}/release/hello /asset-output/bootstrap`
          ],
          image: cdk.DockerImage.fromRegistry('rust:1.65-slim')
        }
      }),
      functionName: 'hello',
      handler: 'main',
      runtime: lambda.Runtime.PROVIDED_AL2
    });

    const authFn = new lambda.Function(this, 'AuthorizerFunction', {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('/home/test/repos/openapix-playground/openapix-cdk/custom-authorizer.zip')
    });

    let custom_authorizer = new openapix.LambdaAuthorizer(this, 'MyCustomAuthorizer', {
      fn: authFn,
      identitySource: apigateway.IdentitySource.header('Authorization'),
      type: 'token',
      authType: 'custom',
      resultsCacheTtl: cdk.Duration.minutes(5),
    });

    new openapix.Api(this, 'HelloApi', {
      authorizers: [custom_authorizer],
      // authorizers: [authorizer],
      source: path.join(__dirname, '../schema/http-proxy.yaml'),
      paths: {
        '/': {
          get: new openapix.LambdaIntegration(this, helloFn),
        },
      },
    })
  }
}
