# Issue #14: EditService API Examples

Complete API usage examples for the EditService implementation.

---

## 1. Edit a Published Post

### Request

```http
PATCH /api/posts/post-123/edit HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "title": "Q3 Performance Update — Revised",
  "content": "Updated quarterly results with final numbers...",
  "changesSummary": "Updated with final Q3 numbers and corrected percentages"
}
```

### Response (200 OK)

```json
{
  "post": {
    "id": "post-123",
    "title": "Q3 Performance Update — Revised",
    "content": "Updated quarterly results with final numbers...",
    "state": "SUBMITTED",
    "createdBy": "alice.smith",
    "createdAt": "2026-07-13T08:00:00Z",
    "proposedAudience": "org-wide"
  },
  "submission": {
    "id": "submission-post-123-1689254400000",
    "postId": "post-123",
    "createdBy": "alice.smith",
    "submittedAt": "2026-07-13T10:30:00Z",
    "state": "PENDING",
    "proposedAudience": "org-wide"
  },
  "revision": {
    "id": "revision-post-123-1689254400000",
    "postId": "post-123",
    "revisionNumber": 1,
    "editedBy": "alice.smith",
    "editedAt": "2026-07-13T10:30:00Z",
    "previousTitle": "Q3 Performance Update",
    "previousContent": "Initial quarterly results...",
    "newTitle": "Q3 Performance Update — Revised",
    "newContent": "Updated quarterly results with final numbers...",
    "changesSummary": "Updated with final Q3 numbers and corrected percentages",
    "submissionId": "submission-post-123-1689254400000"
  }
}
```

---

## 2. Edit with Images

### Request

```http
PATCH /api/posts/post-456/edit HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "title": "Annual Report 2026",
  "content": "Comprehensive annual review with updated charts and graphs.",
  "images": [
    {
      "url": "https://cdn.example.com/chart1.png",
      "size": 2500000,
      "type": "image/png"
    },
    {
      "url": "https://cdn.example.com/chart2.png",
      "size": 3000000,
      "type": "image/png"
    }
  ],
  "changesSummary": "Replaced charts with 2026 final data"
}
```

### Response (200 OK)

```json
{
  "post": {
    "id": "post-456",
    "title": "Annual Report 2026",
    "content": "Comprehensive annual review with updated charts and graphs.",
    "state": "SUBMITTED",
    "images": [
      {
        "url": "https://cdn.example.com/chart1.png",
        "size": 2500000,
        "type": "image/png"
      },
      {
        "url": "https://cdn.example.com/chart2.png",
        "size": 3000000,
        "type": "image/png"
      }
    ],
    "createdBy": "alice.smith",
    "createdAt": "2026-07-13T08:00:00Z"
  },
  "submission": {
    "id": "submission-post-456-1689254401000",
    "postId": "post-456",
    "createdBy": "alice.smith",
    "submittedAt": "2026-07-13T10:31:00Z",
    "state": "PENDING"
  },
  "revision": {
    "id": "revision-post-456-1689254401000",
    "postId": "post-456",
    "revisionNumber": 1,
    "editedBy": "alice.smith",
    "editedAt": "2026-07-13T10:31:00Z",
    "previousTitle": "Annual Report 2026",
    "previousContent": "Initial annual review...",
    "newTitle": "Annual Report 2026",
    "newContent": "Comprehensive annual review with updated charts and graphs.",
    "changesSummary": "Replaced charts with 2026 final data",
    "submissionId": "submission-post-456-1689254401000"
  }
}
```

---

## 3. Edit Content Only (Partial Update)

### Request

```http
PATCH /api/posts/post-789/edit HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "content": "Fixed grammatical errors and improved clarity in the announcement."
}
```

### Response (200 OK)

```json
{
  "post": {
    "id": "post-789",
    "title": "Employee Wellness Program Launch",
    "content": "Fixed grammatical errors and improved clarity in the announcement.",
    "state": "SUBMITTED",
    "createdBy": "bob.jones",
    "createdAt": "2026-07-12T09:00:00Z"
  },
  "submission": {
    "id": "submission-post-789-1689340800000",
    "postId": "post-789",
    "createdBy": "bob.jones",
    "submittedAt": "2026-07-13T11:00:00Z",
    "state": "PENDING"
  },
  "revision": {
    "id": "revision-post-789-1689340800000",
    "postId": "post-789",
    "revisionNumber": 1,
    "editedBy": "bob.jones",
    "editedAt": "2026-07-13T11:00:00Z",
    "previousTitle": "Employee Wellness Program Launch",
    "previousContent": "Original content with errors...",
    "newTitle": "Employee Wellness Program Launch",
    "newContent": "Fixed grammatical errors and improved clarity in the announcement.",
    "changesSummary": "Content revised",
    "submissionId": "submission-post-789-1689340800000"
  }
}
```

---

## 4. Get Revision History for a Post

### Request

```http
GET /api/posts/post-123/revisions HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response (200 OK)

```json
[
  {
    "id": "revision-post-123-1689254400000",
    "postId": "post-123",
    "revisionNumber": 1,
    "editedBy": "alice.smith",
    "editedAt": "2026-07-13T10:30:00Z",
    "previousTitle": "Q3 Performance Update",
    "previousContent": "Initial quarterly results...",
    "newTitle": "Q3 Performance Update — Revised",
    "newContent": "Updated quarterly results with final numbers...",
    "changesSummary": "Updated with final Q3 numbers and corrected percentages",
    "submissionId": "submission-post-123-1689254400000"
  },
  {
    "id": "revision-post-123-1689340800000",
    "postId": "post-123",
    "revisionNumber": 2,
    "editedBy": "alice.smith",
    "editedAt": "2026-07-14T11:00:00Z",
    "previousTitle": "Q3 Performance Update — Revised",
    "previousContent": "Updated quarterly results with final numbers...",
    "newTitle": "Q3 Performance Update — Final Analysis",
    "newContent": "Updated quarterly results with final numbers and detailed analysis...",
    "changesSummary": "Added detailed analysis section",
    "submissionId": "submission-post-123-1689340800000"
  }
]
```

---

## 5. Get Specific Revision

### Request

```http
GET /api/posts/revisions/revision-post-123-1689254400000 HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response (200 OK)

```json
{
  "id": "revision-post-123-1689254400000",
  "postId": "post-123",
  "revisionNumber": 1,
  "editedBy": "alice.smith",
  "editedAt": "2026-07-13T10:30:00Z",
  "previousTitle": "Q3 Performance Update",
  "previousContent": "Initial quarterly results...",
  "newTitle": "Q3 Performance Update — Revised",
  "newContent": "Updated quarterly results with final numbers...",
  "changesSummary": "Updated with final Q3 numbers and corrected percentages",
  "submissionId": "submission-post-123-1689254400000"
}
```

---

## 6. Get Revision Count

### Request

```http
GET /api/posts/post-123/revision-count HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response (200 OK)

```json
{
  "postId": "post-123",
  "revisionCount": 2
}
```

---

## Error Cases

### 1. Post Not Found

**Request:**
```http
PATCH /api/posts/nonexistent/edit HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{"content": "Updated"}
```

**Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "Post not found or you do not have access",
  "error": "Bad Request"
}
```

---

### 2. Not Post Creator

**Request:**
```http
PATCH /api/posts/post-123/edit HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{"content": "Trying to edit someone else's post"}
```

**Response (403 Forbidden):**
```json
{
  "statusCode": 403,
  "message": "Only post creator can edit",
  "error": "Forbidden"
}
```

---

### 3. Not a Published Post

**Request:**
```http
PATCH /api/posts/draft-post-123/edit HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{"content": "Updated"}
```

**Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "Only published posts can be edited. Draft posts use PATCH /api/posts/{id}",
  "error": "Bad Request"
}
```

---

### 4. Empty Content

**Request:**
```http
PATCH /api/posts/post-123/edit HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{"content": ""}
```

**Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "Content cannot be empty",
  "error": "Bad Request"
}
```

---

### 5. Invalid Image Type

**Request:**
```http
PATCH /api/posts/post-123/edit HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "images": [
    {
      "url": "https://example.com/file.exe",
      "size": 1000000,
      "type": "application/exe"
    }
  ]
}
```

**Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "Invalid image type",
  "error": "Bad Request"
}
```

---

### 6. Image Too Large

**Request:**
```http
PATCH /api/posts/post-123/edit HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "images": [
    {
      "url": "https://example.com/huge.jpg",
      "size": 10485760,
      "type": "image/jpeg"
    }
  ]
}
```

**Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "Image size cannot exceed 5MB",
  "error": "Bad Request"
}
```

---

### 7. Too Many Images

**Request:**
```http
PATCH /api/posts/post-123/edit HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "images": [
    {"url": "https://example.com/1.jpg", "size": 1000000, "type": "image/jpeg"},
    {"url": "https://example.com/2.jpg", "size": 1000000, "type": "image/jpeg"},
    {"url": "https://example.com/3.jpg", "size": 1000000, "type": "image/jpeg"},
    {"url": "https://example.com/4.jpg", "size": 1000000, "type": "image/jpeg"}
  ]
}
```

**Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "Maximum 3 images allowed per post",
  "error": "Bad Request"
}
```

---

### 8. Direct Video Upload (Not Allowed)

**Request:**
```http
PATCH /api/posts/post-123/edit HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "video": {
    "url": "https://example.com/video.mp4",
    "source": "direct"
  }
}
```

**Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "Direct video uploads not allowed",
  "error": "Bad Request"
}
```

---

### 9. Invalid Document Type

**Request:**
```http
PATCH /api/posts/post-123/edit HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "documents": [
    {
      "url": "https://example.com/malware.exe",
      "name": "malware.exe",
      "size": 1000000,
      "type": "application/exe"
    }
  ]
}
```

**Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "Unsupported document type",
  "error": "Bad Request"
}
```

---

### 10. Document Too Large

**Request:**
```http
PATCH /api/posts/post-123/edit HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "documents": [
    {
      "url": "https://example.com/huge.pdf",
      "name": "huge.pdf",
      "size": 20971520,
      "type": "application/pdf"
    }
  ]
}
```

**Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "Document size cannot exceed 10MB",
  "error": "Bad Request"
}
```

---

## Complete Workflow Example

### Scenario: Multi-revision Post with Feedback Loop

#### Step 1: Initial Post Creation & Publication

```http
POST /api/posts HTTP/1.1
{"title": "Q3 Report", "content": "Initial content..."}
↓
PATCH /api/posts/{id}/submit
↓
POST /api/approvals/{sub}/approve
↓
Status: PUBLISHED
```

#### Step 2: First Edit

```http
PATCH /api/posts/post-123/edit HTTP/1.1
{
  "content": "Updated with corrected numbers",
  "changesSummary": "Fixed calculation errors"
}
```

Response:
```json
{
  "submission": {
    "id": "submission-2",
    "state": "PENDING"
  },
  "revision": {
    "revisionNumber": 1,
    "submissionId": "submission-2"
  }
}
```

#### Step 3: Admin Sends Feedback

```http
POST /api/approvals/submission-2/feedback HTTP/1.1
{"message": "Add more details about methodology"}
```

#### Step 4: Second Edit Based on Feedback

```http
PATCH /api/posts/post-123/edit HTTP/1.1
{
  "content": "Updated with detailed methodology explanation",
  "changesSummary": "Added detailed methodology per admin feedback"
}
```

Response:
```json
{
  "submission": {
    "id": "submission-3",
    "state": "PENDING"
  },
  "revision": {
    "revisionNumber": 2,
    "submissionId": "submission-3"
  }
}
```

#### Step 5: Admin Approves

```http
POST /api/approvals/submission-3/approve HTTP/1.1
```

Status: PUBLISHED

#### Step 6: View Complete Revision History

```http
GET /api/posts/post-123/revisions HTTP/1.1
```

Response:
```json
[
  {
    "revisionNumber": 1,
    "changesSummary": "Fixed calculation errors",
    "submissionId": "submission-2"
  },
  {
    "revisionNumber": 2,
    "changesSummary": "Added detailed methodology per admin feedback",
    "submissionId": "submission-3"
  }
]
```

---

## Testing with cURL

### Simple Edit Request

```bash
curl -X PATCH http://localhost:3000/api/posts/post-123/edit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Updated content",
    "changesSummary": "Minor corrections"
  }'
```

### Get Revision History

```bash
curl -X GET http://localhost:3000/api/posts/post-123/revisions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Revision Count

```bash
curl -X GET http://localhost:3000/api/posts/post-123/revision-count \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Response Headers

All successful responses include:

```
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: <size>
Date: Mon, 13 Jul 2026 10:30:00 GMT
X-Request-ID: req-123456789
```

---

**Note:** Replace `YOUR_TOKEN` with actual JWT token from authentication endpoint.
