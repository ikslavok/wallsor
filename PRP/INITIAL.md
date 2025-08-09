## FEATURE
On wall page show only top right floating info icon, like we implemented before. Beside that, full pagewithout margins is excalidraw whiteboard. For now only simple pen drawing and adding image is enable is enabled. Store each drawing or image as single node. Drawing without 1 min pause is considered one sesion and will be saved as a node. Base understanding of this on JSON Canvas file format standard. 
Each node is stored in database and tied to user id and wall id. It has timedate of creation. Only the user that created it can delete it. Add realtime collaboration.

## DOCUMENTATION
- Excalidraw: https://docs.excalidraw.com/docs
- JSONcanvas: https://jsoncanvas.org/

## OTHER CONSIDERATIONS
- Use existing error handling patterns
- Follow our standard response format
- Include rate limiting