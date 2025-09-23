# Image Management System

This document describes the comprehensive image management system for wine product images.

## Overview

The image management system provides:
- **Secure image storage** in Supabase Storage
- **Automatic backups** with integrity verification
- **Health monitoring** and validation
- **Error handling** and recovery
- **Admin dashboard** for image management

## Architecture

### Storage Structure
```
Supabase Storage (uploads bucket)
├── [filename].jpg          # Main image files
├── [filename].png          # Additional formats
├── backups/                # Backup folder
│   ├── backup-2025-01-23-[filename].jpg
│   └── ...
└── ...
```

### Database Tables
- `wines` - Wine products with `label_image_path`
- `wine_images` - Multiple images per wine
- `image_backups` - Backup metadata and integrity info

## Features

### 1. Image Upload & Validation
- **File type validation**: JPEG, PNG, WebP, GIF
- **Size limits**: Max 10MB per file
- **Dimension checks**: Min 200x200px, Max 4000x4000px
- **Aspect ratio warnings**: Suggests 1:1 ratio for best results

### 2. Automatic Backups
- **Pre-upload backup**: Images backed up before main upload
- **Integrity verification**: SHA256 checksums
- **Metadata tracking**: Backup location, timestamp, checksum
- **Automatic cleanup**: Old backups removed after 30 days

### 3. Health Monitoring
- **Accessibility checks**: Verifies all images are accessible
- **Health scoring**: Overall system health percentage
- **Issue detection**: Missing or broken images
- **Recommendations**: Actionable suggestions for improvements

### 4. Error Recovery
- **Graceful degradation**: Fallback to Unsplash images
- **Backup restoration**: Restore from backup if main image fails
- **Detailed logging**: Comprehensive error tracking

## API Endpoints

### Upload
```
POST /api/upload
Content-Type: multipart/form-data

Body: files[] (image files)
Response: { success: boolean, files: string[], errors?: string[] }
```

### Image Proxy
```
GET /api/images/[path]
Response: Image file or redirect to full URL
```

### Health Check
```
GET /api/admin/image-health
Response: Comprehensive health report
```

## Admin Interface

### Image Health Dashboard
Access at `/admin/images`

Features:
- **Real-time health monitoring**
- **Visual health score**
- **Issue detection and reporting**
- **Recommendations for improvements**
- **Detailed image status**

### Wine Management
Access at `/admin/wines`

Features:
- **Multi-image upload**
- **Drag-and-drop reordering**
- **Primary image selection**
- **Image preview and management**

## Best Practices

### Image Upload
1. **Use appropriate formats**: JPEG for photos, PNG for graphics
2. **Optimize file sizes**: Compress before upload
3. **Use consistent dimensions**: 600x600px recommended
4. **Provide alt text**: For accessibility

### Backup Management
1. **Monitor backup health**: Check dashboard regularly
2. **Verify integrity**: Use checksum verification
3. **Clean old backups**: Automatic cleanup after 30 days
4. **Test restoration**: Periodically test backup recovery

### Health Monitoring
1. **Regular health checks**: Run weekly health reports
2. **Address issues promptly**: Fix missing images quickly
3. **Monitor trends**: Watch for recurring issues
4. **Update recommendations**: Follow system suggestions

## Troubleshooting

### Common Issues

#### Images Not Loading
1. Check image health dashboard
2. Verify file exists in Supabase Storage
3. Check image proxy API logs
4. Validate image path format

#### Upload Failures
1. Check file size and format
2. Verify Supabase Storage permissions
3. Check backup system status
4. Review upload API logs

#### Backup Issues
1. Verify backup folder exists
2. Check backup table permissions
3. Monitor backup cleanup process
4. Test backup restoration

### Recovery Procedures

#### Restore from Backup
1. Identify missing image in health dashboard
2. Find backup record in database
3. Use restore function to recover image
4. Verify image accessibility

#### Manual Image Recovery
1. Upload new image via admin interface
2. Update wine_images table manually if needed
3. Verify image appears correctly
4. Run health check to confirm

## Security Considerations

### Access Control
- **Admin-only upload**: Only authenticated admins can upload
- **RLS policies**: Row-level security on all tables
- **Service role**: Backup system uses service role

### Data Integrity
- **Checksum verification**: SHA256 for all backups
- **Path validation**: Prevents directory traversal
- **File type restrictions**: Only image files allowed

### Monitoring
- **Upload logging**: All uploads logged
- **Error tracking**: Comprehensive error reporting
- **Health alerts**: Proactive issue detection

## Maintenance

### Regular Tasks
- **Weekly health checks**: Run comprehensive health reports
- **Monthly backup review**: Verify backup integrity
- **Quarterly cleanup**: Review and optimize storage

### Automated Tasks
- **Daily backup cleanup**: Remove old backups
- **Continuous monitoring**: Real-time health tracking
- **Error alerting**: Immediate issue notifications

## Future Enhancements

### Planned Features
- **Image optimization**: Automatic compression and resizing
- **CDN integration**: Global image delivery
- **Advanced analytics**: Image usage statistics
- **Batch operations**: Bulk image management

### Scalability
- **Storage optimization**: Efficient file organization
- **Caching strategies**: Improved performance
- **Load balancing**: Handle high traffic
- **Monitoring expansion**: Advanced metrics

## Support

For issues or questions:
1. Check the health dashboard first
2. Review this documentation
3. Check system logs
4. Contact development team

## Version History

- **v1.0** - Initial image management system
- **v1.1** - Added backup system
- **v1.2** - Health monitoring dashboard
- **v1.3** - Enhanced error handling and recovery
