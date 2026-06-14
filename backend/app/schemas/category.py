from pydantic import BaseModel,ConfigDict,Field
from typing import Optional

class CategoryCreate(BaseModel):
    name : str = Field(min_length=1,max_length=200)
    description : Optional[str] = None

class CategoryResponse(BaseModel):
    id : int 
    name : str = Field(min_length=1,max_length=200)
    description : Optional[str] = None

    model_config = ConfigDict(from_attributes=True)