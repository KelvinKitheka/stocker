from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length = 150)
    email = serializers.EmailField(required=False)
    first_name = serializers.CharField(max_length = 150)
    last_name = serializers.CharField(max_length = 150)
    password = serializers.CharField(write_only = True, min_length = 8)
    confirm_password = serializers.CharField(write_only = True)

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value
    
    def validate_email(self, value):
        if value and User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists")
        return value
    
    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"Confirm Passwords" : "Password do not match."})
        
        try:
            validate_password(data['password'])
        except Exception as e:
            raise serializers.ValidationError({"password" : list(e.messages)})
        return data
    
    def create(self, validated_data):
        validated_data.pop("confirm password")
        user = User.objects.create_user(
            username= validated_data['username'],
            email = validated_data['email'],
            first_name = validated_data['first_name'],
            last_name = validated_data['last_name'],
            password= validated_data['password']
        )

        return user