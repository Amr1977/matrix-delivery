@profile-picture @security
Feature: Profile Picture Upload Security
  As a user of Matrix Delivery
  I want my profile picture to be handled securely
  So that my data is protected and images display correctly

  Background:
    Given the API server is running

  @cors
  Scenario: Uploaded images have correct CORS headers
    When I request an image from "/uploads/images/test.jpg"
    Then the response should have header "Cross-Origin-Resource-Policy" with value "cross-origin"
    And the response should have header "Access-Control-Allow-Origin"

  @security @path-traversal
  Scenario: Path traversal attacks are blocked
    When I request "/uploads/images/../../../etc/passwd"
    Then the response status should be one of "400,403,404"
    And the response body should not contain "root:"

  @security @path-traversal
  Scenario: URL-encoded path traversal is blocked
    When I request "/uploads/images/%2e%2e%2f%2e%2e%2fetc%2fpasswd"
    Then the response status should be one of "400,403,404"
    And the response body should not contain "root:"

  @authentication
  Scenario: Profile picture upload requires authentication
    When I POST to "/api/users/me/profile-picture" without authentication
    Then the response status should be one of "401,403"

  @upload
  Scenario: Profile picture upload accepts valid images
    Given I am logged in as a test user
    When I upload a valid JPEG image to "/api/users/me/profile-picture"
    Then the response status should be 200 or 201
    And the response should contain a "profilePictureUrl"
    And the "profilePictureUrl" should start with "/uploads/images/"

  @display
  Scenario: Uploaded profile pictures are accessible
    Given I am logged in as a test user
    And I have uploaded a profile picture
    When I request my profile picture URL
    Then the response status should be 200
    And the response content-type should be "image/jpeg"
